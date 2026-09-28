import unittest
from unittest.mock import MagicMock, patch

from services.violation_service import evaluate_event
from services import proctoring_service


class ProctoringTests(unittest.TestCase):
    def test_third_departure_terminates(self):
        count = 0
        for event, action in zip(
            ['FULLSCREEN_EXIT', 'TAB_SWITCH', 'FULLSCREEN_EXIT'],
            ['WARN', 'FINAL_WARN', 'TERMINATE'],
        ):
            result = evaluate_event(event, count, 3)
            self.assertEqual(result['action'], action)
            count = result['new_violation_count']
        self.assertEqual(count, 3)
        self.assertEqual(result['new_status'], 'TERMINATED')

    def test_media_loss_does_not_consume_warning(self):
        result = evaluate_event('CAMERA_DISABLED', 2, 3)
        self.assertEqual(result['action'], 'PAUSE')
        self.assertEqual(result['new_violation_count'], 2)

    @patch('services.proctoring_service.get_connection')
    def test_third_event_locks_count_and_abandons_session(self, get_connection):
        conn = get_connection.return_value
        cursor = conn.cursor.return_value
        cursor.fetchone.return_value = {
            'status': 'WARNING', 'violation_count': 2, 'max_violations': 3,
        }
        result = proctoring_service.record_event(1, 'TAB_SWITCH')
        self.assertEqual(result['action'], 'TERMINATE')
        statements = [call.args[0] for call in cursor.execute.call_args_list]
        self.assertIn('FOR UPDATE', statements[0])
        self.assertTrue(any("status = 'abandoned'" in sql for sql in statements))
        conn.commit.assert_called_once()

    @patch('services.proctoring_service.get_connection')
    def test_late_focus_event_cannot_revive_terminated_session(self, get_connection):
        cursor = get_connection.return_value.cursor.return_value
        cursor.fetchone.return_value = {
            'status': 'TERMINATED', 'violation_count': 3, 'max_violations': 3,
        }
        result = proctoring_service.record_event(1, 'WINDOW_FOCUS_RETURN')
        self.assertEqual(result['action'], 'TERMINATE')
        self.assertEqual(result['violation_count'], 3)
        self.assertEqual(cursor.execute.call_count, 1)


if __name__ == '__main__':
    unittest.main()
