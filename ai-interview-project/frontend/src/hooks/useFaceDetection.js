import { useEffect, useRef } from 'react';
import { loadFaceApiModels, isFaceApiLoaded, faceapi } from './faceApiLoader.js';

export function useFaceDetection({
  videoRef,
  isActive = false,
  onNoFaceDetected,
  onMultipleFacesDetected,
  onFaceOk,
  detectionIntervalMs = 2000,
  noFaceThreshold = 4,
  multipleFaceThreshold = 3,
} = {}) {
  const noFaceCountRef = useRef(0);
  const multipleFaceCountRef = useRef(0);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const onNoFaceRef = useRef(onNoFaceDetected);
  onNoFaceRef.current = onNoFaceDetected;

  const onMultipleFacesRef = useRef(onMultipleFacesDetected);
  onMultipleFacesRef.current = onMultipleFacesDetected;

  const onFaceOkRef = useRef(onFaceOk);
  onFaceOkRef.current = onFaceOk;

  useEffect(() => {
    loadFaceApiModels().catch((e) => {
      console.warn('Face detection model init failed:', e);
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;

    let isCancelled = false;
    let detecting = false;
    let reported = null;
    let healthyCount = 0;
    noFaceCountRef.current = 0;
    multipleFaceCountRef.current = 0;

    const intervalId = setInterval(async () => {
      if (isCancelled || !isActiveRef.current) return;

      if (detecting) return;
      const video = videoRef?.current;
      const track = video?.srcObject?.getVideoTracks()[0];
      if (
        document.hidden ||
        !track || track.readyState !== 'live' || !track.enabled || track.muted ||
        !video ||
        video.readyState < 2 ||
        video.paused ||
        video.ended ||
        video.videoWidth === 0
      ) {
        noFaceCountRef.current = 0;
        multipleFaceCountRef.current = 0;
        healthyCount = 0;
        return;
      }

      detecting = true;
      try {
        if (!isFaceApiLoaded()) {
          await loadFaceApiModels();
          if (!isFaceApiLoaded()) return;
        }
        if (isCancelled || !isActiveRef.current) return;

        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5,
        });

        const detections = await faceapi.detectAllFaces(video, options);

        if (isCancelled || !isActiveRef.current) return;

        // Ignore results if the camera stopped or the tab was hidden during inference.
        if (document.hidden || track.muted || track.readyState !== 'live' || !track.enabled) {
          noFaceCountRef.current = 0;
          multipleFaceCountRef.current = 0;
          healthyCount = 0;
          return;
        }
        const count = detections.length;

        if (count !== 1) healthyCount = 0;
        if (count === 0) {
          noFaceCountRef.current += 1;
          multipleFaceCountRef.current = 0;

          if (noFaceCountRef.current >= noFaceThreshold && reported !== 'no-face') {
            if (onNoFaceRef.current) {
              onNoFaceRef.current();
            }
            reported = 'no-face';
          }
        } else if (count > 1) {
          multipleFaceCountRef.current += 1;
          noFaceCountRef.current = 0;

          if (multipleFaceCountRef.current >= multipleFaceThreshold && reported !== 'multiple-faces') {
            if (onMultipleFacesRef.current) {
              onMultipleFacesRef.current({ faceCount: count });
            }
            reported = 'multiple-faces';
          }
        } else {
          healthyCount += 1;
          if (healthyCount >= 2) reported = null;
          // Exactly 1 face
          noFaceCountRef.current = 0;
          multipleFaceCountRef.current = 0;
          if (onFaceOkRef.current) {
            onFaceOkRef.current();
          }
        }
      } catch (err) {
        noFaceCountRef.current = 0;
        multipleFaceCountRef.current = 0;
        healthyCount = 0;
        console.warn('Face detection execution error:', err);
      } finally {
        detecting = false;
      }
    }, detectionIntervalMs);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [isActive, videoRef, detectionIntervalMs, noFaceThreshold, multipleFaceThreshold]);
}
