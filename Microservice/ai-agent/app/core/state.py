import time
from .analyzer import WaveformAnalyzer

# singleton app state
class AppState:
    def __init__(self):
        self.analyzer = WaveformAnalyzer()
        self.start_time = time.time()
        self.request_count = 0
        self.total_inference_time = 0.0


app_state = AppState()
