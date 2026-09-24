"""All AI calls go through Groq only (LLM + speech-to-text)."""
import os
import json
from groq import Groq

_client = None


def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


MODEL_LARGE = os.getenv("GROQ_MODEL_LARGE", "openai/gpt-oss-120b")
MODEL_SMALL = os.getenv("GROQ_MODEL_SMALL", "openai/gpt-oss-20b")
WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")


def _safe_parse_json(raw: str) -> dict:
    """Strip common wrappers (code fences) defensively, even though we asked for raw JSON."""
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ValueError(f"Groq returned invalid JSON: {cleaned[:300]}") from err


def _call_groq_json(model: str, system_prompt: str, user_prompt: str, temperature: float = 0.4) -> dict:
    client = get_client()
    completion = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": system_prompt
                + "\n\nRespond with ONLY valid JSON. No markdown, no code fences, no explanation text before or after the JSON.",
            },
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = completion.choices[0].message.content
    return _safe_parse_json(raw)


def extract_resume_data(resume_text: str) -> dict:
    """Step: Parse resume text into structured data."""
    system_prompt = """You are a resume parser for a technical interview system.
Extract structured information from the candidate's resume text.
Return JSON in exactly this shape:
{
  "name": string,
  "technical_skills": string[],
  "programming_languages": string[],
  "projects": [ { "title": string, "description": string, "technologies": string[] } ],
  "internships": [ { "role": string, "company": string, "duration": string, "description": string } ],
  "education": [ { "degree": string, "institution": string, "year": string } ],
  "years_of_experience_estimate": number
}
If a field is not found, use an empty array or empty string. Do not invent information not present in the resume."""

    return _call_groq_json(
        model=MODEL_LARGE,
        system_prompt=system_prompt,
        user_prompt=f"Resume text:\n\n{resume_text}",
        temperature=0.2,
    )


def generate_interview_plan(parsed_resume: dict, duration_minutes: int) -> dict:
    """Step: Build the interview plan (topics to cover) from parsed resume data."""
    system_prompt = f"""You are an AI interview planner. Based on the candidate's resume data,
build a short interview plan focused ONLY on: (1) technical skills, (2) internships, (3) projects.
Return JSON in exactly this shape:
{{
  "topics": [ {{ "name": string, "type": "technical_skill"|"internship"|"project", "reference": string }} ],
  "difficulty_start": "easy"|"medium"|"hard",
  "estimated_questions": number
}}
Pick 3 to 6 topics maximum, prioritizing the candidate's strongest and most recent projects/internships and their listed technical skills.
estimated_questions should be reasonable for a {duration_minutes}-minute interview (assume ~2 minutes per question including thinking time)."""

    return _call_groq_json(
        model=MODEL_LARGE,
        system_prompt=system_prompt,
        user_prompt=f"Parsed resume data:\n{json.dumps(parsed_resume)}\n\nInterview duration: {duration_minutes} minutes.",
        temperature=0.3,
    )


def generate_next_question(parsed_resume: dict, plan: dict, history: list, current_topic: str) -> dict:
    """Step: Generate the next interview question, text-only."""
    system_prompt = """You are a friendly, professional AI technical interviewer speaking directly to the candidate.
Ask exactly ONE clear, natural-sounding interview question at a time, based on the candidate's resume.
Only ask about: their technical skills, their internships, or their projects — nothing else (no personal questions, no company confidential prompts).
Keep the question concise (1-3 sentences), conversational, and easy to understand out loud.
Do not repeat a question already asked. Build naturally on the candidate's previous answers when relevant.
Return JSON in exactly this shape:
{
  "question_text": string,
  "topic": string
}"""

    user_prompt = (
        f"Candidate resume data:\n{json.dumps(parsed_resume)}\n\n"
        f"Interview plan:\n{json.dumps(plan)}\n\n"
        f"Current topic to focus on: {current_topic or 'pick the most relevant next topic from the plan'}\n\n"
        f"Conversation history so far (question/answer pairs):\n{json.dumps(history, default=str)}"
    )

    return _call_groq_json(
        model=MODEL_LARGE,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.6,
    )


def evaluate_answer_and_decide(question: str, answer_text: str, parsed_resume: dict) -> dict:
    """Step: Evaluate the candidate's answer AND decide the adaptive next step, in one call."""
    system_prompt = """You are grading one answer in a technical interview.
Score the answer on three 0-10 scales and decide what should happen next.
Return JSON in exactly this shape:
{
  "technical_score": number,
  "depth_score": number,
  "relevance_score": number,
  "rationale": string,
  "adaptive_decision": "follow_up" | "new_topic" | "change_difficulty" | "end_topic"
}
Guidance for adaptive_decision:
- "follow_up": the answer was reasonable but could go deeper on the same topic.
- "new_topic": the topic has been sufficiently covered, move to a different topic from the plan.
- "change_difficulty": the answer suggests the current difficulty is mismatched (too easy or too hard) and should adjust.
- "end_topic": the answer was very weak or very strong and further questioning on this exact topic won't add value; move on.
If the candidate did not answer at all or the answer is empty/irrelevant, score low and choose "new_topic"."""

    user_prompt = (
        f'Question asked: "{question}"\n\nCandidate\'s answer: "{answer_text}"\n\n'
        f"Candidate resume context:\n{json.dumps(parsed_resume)}"
    )

    return _call_groq_json(
        model=MODEL_SMALL,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.3,
    )


def generate_final_report(parsed_resume: dict, turns: list) -> dict:
    """Step: Final report after the interview ends."""
    system_prompt = """You are compiling a final interview evaluation report.
Return JSON in exactly this shape:
{
  "overall_score": number,
  "skill_scores": { "technical_knowledge": number, "problem_depth": number, "communication_relevance": number },
  "strengths": string[],
  "weaknesses": string[],
  "feedback_text": string,
  "recommendation": "Strong Hire" | "Hire" | "Borderline" | "No Hire"
}
Base this entirely on the interview turns provided (questions, answers, and per-answer scores). Be fair and specific — reference actual topics discussed."""

    user_prompt = (
        f"Candidate resume context:\n{json.dumps(parsed_resume)}\n\n"
        f"All interview turns:\n{json.dumps(turns, default=str)}"
    )

    return _call_groq_json(
        model=MODEL_LARGE,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.3,
    )


def transcribe_audio(file_path: str, vocabulary_hint: str = "", language: str = "en") -> str:
    """Transcribe a recorded answer using Groq's hosted Whisper model."""
    client = get_client()
    prompt_text = (
        "This is a spoken answer in a technical job interview. "
        "Transcribe exactly what is said, including filler words. "
        + (f"Relevant technical terms the candidate may use: {vocabulary_hint}." if vocabulary_hint else "")
    )
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(file_path), audio_file.read()),
            model=WHISPER_MODEL,
            response_format="text",
            language=language,
            prompt=prompt_text,
            temperature=0.0,
        )
    if isinstance(transcription, str):
        return transcription.strip()
    return (getattr(transcription, "text", "") or "").strip()
