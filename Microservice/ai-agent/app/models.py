import asyncio
import logging
import time
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator, confloat, constr

# setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# incoming telemetry from ESP32
class TelemetryInput(BaseModel):
    pole_id: constr(min_length=1, max_length=64) = Field(...)
    timestamp: int = Field(..., gt=0)
    supply_current: confloat(ge=0.0, le=1000.0) = Field(..., alias="supply_current")
    meter_sum: confloat(ge=0.0, le=1000.0) = Field(..., alias="meter_sum")
    voltage: confloat(ge=0.0, le=500.0) = Field(...)
    differential: confloat(ge=-1000.0, le=1000.0) = Field(...)
    potential_theft: bool = Field(default=False)
    anomaly_score: confloat(ge=0.0, le=1.0) = Field(default=0.0)
    
    # make sure differential matches supply - meter
    @validator('differential')
    def validate_differential(cls, v, values):
        supply = values.get('supply_current', 0)
        meter = values.get('meter_sum', 0)
        expected = supply - meter
        if abs(v - expected) > max(abs(expected) * 0.05, 0.01):
            raise ValueError(f"Differential {v} doesn't match calculated value {expected}")
        return v
    
    class Config:
        populate_by_name = True


# optional waveform data for better detection
class WaveformData(BaseModel):
    sample_rate: int = Field(..., gt=0)
    samples: List[float] = Field(..., min_items=100, max_items=10000)
    duration_ms: int = Field(..., gt=0)
    
    @validator('samples')
    def validate_samples(cls, v):
        if len(v) < 100:
            raise ValueError('At least 100 samples required for waveform analysis')
        return v


class AnalysisRequest(BaseModel):
    telemetry: TelemetryInput
    waveform: Optional[WaveformData] = None
    include_explanation: bool = Field(default=False)


# what we return to .NET
class TheftVerdict(BaseModel):
    is_theft: bool = Field(...)
    confidence: confloat(ge=0.0, le=1.0) = Field(...)
    category: constr(pattern=r'^(normal|suspicious|theft|error)$') = Field(...)
    details: Optional[dict] = Field(default=None)
    processing_time_ms: float = Field(...)
    timestamp: str = Field(...)


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
    total_requests: int
    model_loaded: bool


class BatchAnalysisRequest(BaseModel):
    readings: List[TelemetryInput] = Field(..., min_items=1, max_items=100)


class BatchAnalysisResponse(BaseModel):
    results: List[TheftVerdict]
    summary: dict


# mock ML analyzer - replace with real model later
class WaveformAnalyzer:
    def __init__(self):
        self.model_loaded = False
        self.inference_count = 0
        self._load_model()
    
    def _load_model(self):
        logger.info("Loading waveform analysis model...")
        self.model_loaded = True
        logger.info("Model loaded successfully")
    
    async def analyze_waveform(self, waveform: WaveformData) -> dict:
        # simulate async inference
        await asyncio.sleep(0.01)
        samples = np.array(waveform.samples)
        # extract some features
        features = {
            'variance': float(np.var(samples)),
            'std_dev': float(np.std(samples)),
            'peak_to_rms': float(np.max(np.abs(samples)) / np.sqrt(np.mean(samples**2))),
            'zero_crossings': int(np.sum(np.diff(np.signbit(samples)))),
            'skewness': float(self._calculate_skewness(samples)),
            'kurtosis': float(self._calculate_kurtosis(samples))
        }
        # simple scoring for now
        variance_score = min(features['variance'] / 10.0, 1.0)
        thd_score = min(features['skewness'] * 0.5 + 0.5, 1.0)
        confidence = (variance_score * 0.6) + (thd_score * 0.4)
        return {
            'confidence': confidence,
            'features': features,
            'anomaly_detected': confidence > 0.7
        }
    
    def _calculate_skewness(self, data: np.ndarray) -> float:
        n = len(data)
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return (np.sum((data - mean) ** 3) / n) / (std ** 3)
    
    def _calculate_kurtosis(self, data: np.ndarray) -> float:
        n = len(data)
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return (np.sum((data - mean) ** 4) / n) / (std ** 4) - 3
    
    # check telemetry indicators
    def analyze_telemetry(self, telemetry: TelemetryInput) -> dict:
        indicators = []
        diff_magnitude = abs(telemetry.differential)
        diff_threshold = 0.5
        if diff_magnitude > diff_threshold:
            indicators.append({
                'type': 'high_differential',
                'severity': min(diff_magnitude / diff_threshold, 3.0),
                'description': f'Current differential {diff_magnitude:.3f}A exceeds threshold'
            })
        if telemetry.voltage > 0 and telemetry.supply_current > 0:
            apparent_power = telemetry.voltage * telemetry.supply_current
            power_factor = 0.85 + (np.random.random() * 0.1)
            if power_factor < 0.5:
                indicators.append({
                    'type': 'power_factor_anomaly',
                    'severity': 2.0,
                    'description': f'Abnormal power factor: {power_factor:.3f}'
                })
        if telemetry.anomaly_score > 0.5:
            indicators.append({
                'type': 'edge_anomaly',
                'severity': telemetry.anomaly_score * 2,
                'description': f'Edge device reported anomaly score: {telemetry.anomaly_score:.3f}'
            })
        return {
            'indicators': indicators,
            'indicator_count': len(indicators),
            'max_severity': max([i['severity'] for i in indicators], default=0)
        }


# shared app state
class AppState:
    def __init__(self):
        self.analyzer = WaveformAnalyzer()
        self.start_time = time.time()
        self.request_count = 0
        self.total_inference_time = 0.0


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Inference Service starting up...")
    yield
    logger.info("AI Inference Service shutting down...")
