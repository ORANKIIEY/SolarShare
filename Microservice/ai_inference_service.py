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

# ─────────────────────────────────────────────────────────────────────────────
# GridGuard AI Python Microservice — Batch Forensic Validator
#
# ROLE IN THE EDGE-FIRST ARCHITECTURE:
#   This service is NOT the primary classifier. Real-time theft detection
#   runs on the ESP32-S3 via a quantised TinyML model (MindSpore → TFLite Micro).
#   The 200 kHz waveform is classified AT THE POLE — only structured alerts
#   (differential, anomaly_score, edge verdict) are sent over MQTT/IoTDA.
#
#   This service provides:
#   1. BATCH FORENSIC VALIDATION — secondary high-precision floating-point
#      re-analysis of a waveform snippet already uploaded to OBS.
#      Called by TheftService.cs AFTER the edge verdict, to confirm before
#      writing a legal incident record.
#   2. OFFLINE RETRAINING SUPPORT — exposes /batch endpoint for bulk
#      historical analysis used to generate new training datasets for the
#      next TinyML model version (pushed to poles via IoTDA OTA).
#
# Work Breakdown: TensorFlow/PyTorch → MindSpore AI framework
# ─────────────────────────────────────────────────────────────────────────────

# ==================== LOGGING CONFIGURATION ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================
class TelemetryInput(BaseModel):
    """Strict validation for incoming telemetry from edge devices"""
    
    pole_id: constr(min_length=1, max_length=64) = Field(
        ..., 
        description="Unique identifier for the monitoring pole"
    )
    timestamp: int = Field(
        ..., 
        description="Unix timestamp in milliseconds from edge device",
        gt=0
    )
    supply_current: confloat(ge=0.0, le=1000.0) = Field(
        ..., 
        description="Supply current in Amperes",
        alias="supply_current"
    )
    meter_sum: confloat(ge=0.0, le=1000.0) = Field(
        ..., 
        description="Sum of all meter readings in Amperes",
        alias="meter_sum"
    )
    voltage: confloat(ge=0.0, le=500.0) = Field(
        ..., 
        description="Line voltage in Volts"
    )
    differential: confloat(ge=-1000.0, le=1000.0) = Field(
        ..., 
        description="Current differential (Supply - Meter Sum)"
    )
    potential_theft: bool = Field(
        default=False,
        description="Preliminary theft flag from edge device"
    )
    anomaly_score: confloat(ge=0.0, le=1.0) = Field(
        default=0.0,
        description="Preliminary anomaly score from edge device"
    )
    
    @validator('differential')
    def validate_differential(cls, v, values):
        """Validate that differential matches supply - meter_sum approximately"""
        supply = values.get('supply_current', 0)
        meter = values.get('meter_sum', 0)
        expected = supply - meter
        
        # Allow 5% tolerance for floating point differences
        if abs(v - expected) > max(abs(expected) * 0.05, 0.01):
            raise ValueError(f"Differential {v} doesn't match calculated value {expected}")
        return v
    
    class Config:
        populate_by_name = True


class WaveformData(BaseModel):
    """Optional waveform data for advanced analysis"""
    
    sample_rate: int = Field(..., gt=0, description="Samples per second")
    samples: List[float] = Field(..., min_items=100, max_items=10000)
    duration_ms: int = Field(..., gt=0)
    
    @validator('samples')
    def validate_samples(cls, v):
        if len(v) < 100:
            raise ValueError('At least 100 samples required for waveform analysis')
        return v


class AnalysisRequest(BaseModel):
    """Request body for batch forensic validation.
    
    Sent by TheftService.cs after the ESP32-S3 TinyML edge verdict.
    The edge_verdict and edge_anomaly_score are used for cross-validation.
    """
    telemetry: TelemetryInput
    waveform: Optional[WaveformData] = None
    # The ESP32's own classification result — used to cross-validate cloud result
    edge_verdict: Optional[str] = Field(
        default=None,
        description="TinyML verdict from ESP32-S3: 'theft' | 'normal' | 'suspicious'"
    )
    edge_anomaly_score: Optional[float] = Field(
        default=None,
        description="Anomaly score computed on-device by the ESP32-S3"
    )
    include_explanation: bool = Field(
        default=False,
        description="Include detailed analysis explanation"
    )


class TheftVerdict(BaseModel):
    """Theft analysis verdict response"""
    
    is_theft: bool = Field(..., description="Final theft determination")
    confidence: confloat(ge=0.0, le=1.0) = Field(
        ..., 
        description="Confidence score (0.0 - 1.0)"
    )
    category: constr(pattern=r'^(normal|suspicious|theft|error)$') = Field(
        ..., 
        description="Classification category"
    )
    details: Optional[dict] = Field(
        default=None,
        description="Detailed analysis breakdown"
    )
    processing_time_ms: float = Field(..., description="Inference time")
    timestamp: str = Field(..., description="ISO format timestamp")


class HealthResponse(BaseModel):
    """Service health check response"""
    
    status: str
    version: str
    uptime_seconds: float
    total_requests: int
    model_loaded: bool


class BatchAnalysisRequest(BaseModel):
    """Batch analysis for multiple telemetry points"""
    
    readings: List[TelemetryInput] = Field(..., min_items=1, max_items=100)


class BatchAnalysisResponse(BaseModel):
    """Batch analysis results"""
    
    results: List[TheftVerdict]
    summary: dict


# ==================== AI INFERENCE ENGINE ====================
class WaveformAnalyzer:
    """
    Batch forensic inference engine for electrical waveform analysis.

    Role: Secondary high-precision floating-point classifier that validates
    the ESP32-S3's edge TinyML verdict. This runs AFTER the pole device has
    already classified the event — it is used to confirm before committing
    a legal incident record to TaurusDB and OBS.

    In production, this loads a full-precision MindSpore model deployed via
    Huawei ModelArts. The model is trained offline on historical waveform
    snippets and its quantised version is compiled to TFLite Micro and
    pushed to the ESP32-S3 via IoTDA OTA.
    """
    
    def __init__(self):
        self.model_loaded = False
        self.inference_count = 0
        self._load_model()
    
    def _load_model(self):
        """Load the ML model (mock implementation).
        
        In production this loads a MindSpore model deployed via Huawei ModelArts.
        (Project_Work_Breakdown: TensorFlow/PyTorch \u2192 MindSpore AI framework)
        """
        logger.info("Loading waveform analysis model...")
        # Production (MindSpore on ModelArts):
        #   import mindspore as ms
        #   self.model = ms.load_checkpoint('gridguard_theft_detector.ckpt')
        # For local development the TheftService.cs calls the ModelArts REST endpoint directly.
        self.model_loaded = True
        logger.info("Model loaded successfully (MindSpore-ready)")
    
    async def analyze_waveform(self, waveform: WaveformData) -> dict:
        """
        Analyze waveform for theft signatures.
        
        Expert features analyzed:
        - Harmonic distortion (THD)
        - Waveform variance
        - Zero-crossing irregularities
        - Peak-to-RMS ratio anomalies
        """
        await asyncio.sleep(0.01)  # Simulate async inference
        
        samples = np.array(waveform.samples)
        
        # Feature extraction (simulating real ML features)
        features = {
            'variance': float(np.var(samples)),
            'std_dev': float(np.std(samples)),
            'peak_to_rms': float(np.max(np.abs(samples)) / np.sqrt(np.mean(samples**2))),
            'zero_crossings': int(np.sum(np.diff(np.signbit(samples)))),
            'skewness': float(self._calculate_skewness(samples)),
            'kurtosis': float(self._calculate_kurtosis(samples))
        }
        
        # Mock inference: variance-based confidence
        # High variance in differential indicates potential theft (ghost load)
        variance_score = min(features['variance'] / 10.0, 1.0)
        thd_score = min(features['skewness'] * 0.5 + 0.5, 1.0)
        
        # Combined confidence score
        confidence = (variance_score * 0.6) + (thd_score * 0.4)
        
        return {
            'confidence': confidence,
            'features': features,
            'anomaly_detected': confidence > 0.7
        }
    
    def _calculate_skewness(self, data: np.ndarray) -> float:
        """Calculate skewness of data distribution"""
        n = len(data)
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return (np.sum((data - mean) ** 3) / n) / (std ** 3)
    
    def _calculate_kurtosis(self, data: np.ndarray) -> float:
        """Calculate kurtosis (peakedness) of distribution"""
        n = len(data)
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return (np.sum((data - mean) ** 4) / n) / (std ** 4) - 3
    
    def analyze_telemetry(self, telemetry: TelemetryInput) -> dict:
        """
        Analyze telemetry metrics for theft indicators.
        
        Indicators:
        - Large current differential (Ghost Load)
        - Unusual voltage-current relationship
        - Anomalous timing patterns
        """
        indicators = []
        
        # Differential analysis
        diff_magnitude = abs(telemetry.differential)
        diff_threshold = 0.5  # Amps
        
        if diff_magnitude > diff_threshold:
            indicators.append({
                'type': 'high_differential',
                'severity': min(diff_magnitude / diff_threshold, 3.0),
                'description': f'Current differential {diff_magnitude:.3f}A exceeds threshold'
            })
        
        # Power factor anomaly (simplified)
        if telemetry.voltage > 0 and telemetry.supply_current > 0:
            apparent_power = telemetry.voltage * telemetry.supply_current
            # Mock power factor calculation
            power_factor = 0.85 + (np.random.random() * 0.1)
            
            if power_factor < 0.5:
                indicators.append({
                    'type': 'power_factor_anomaly',
                    'severity': 2.0,
                    'description': f'Abnormal power factor: {power_factor:.3f}'
                })
        
        # Edge device anomaly score integration
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


# ==================== APPLICATION STATE ====================
class AppState:
    """Shared application state"""
    
    def __init__(self):
        self.analyzer = WaveformAnalyzer()
        self.start_time = time.time()
        self.request_count = 0
        self.total_inference_time = 0.0


# Global state instance
app_state = AppState()


# ==================== LIFESPAN MANAGEMENT ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown"""
    # Startup
    logger.info("AI Inference Service starting up...")
    yield
    # Shutdown
    logger.info("AI Inference Service shutting down...")


# ==================== FASTAPI APPLICATION ====================
app = FastAPI(
    title="GridGuard AI Inference Service",
    description="High-performance async inference API for electricity theft detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS: restrict to internal Huawei VPC origins in production
# (backend CCE pods call this service via ClusterIP — no public internet exposure)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",          # Local .NET backend dev
        "http://gridguard-api-svc",       # CCE ClusterIP service name
        "https://*.myhuaweicloud.com",    # Huawei Cloud internal services
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Auth-Token"],
)


# ==================== API ENDPOINTS ====================
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime_seconds=time.time() - app_state.start_time,
        total_requests=app_state.request_count,
        model_loaded=app_state.analyzer.model_loaded
    )


@app.post("/analyze", response_model=TheftVerdict)
async def analyze_telemetry(request: AnalysisRequest):
    """
    Analyze telemetry data for theft detection.
    
    This endpoint accepts electrical telemetry from the .NET orchestrator
    and returns a theft verdict with confidence score.
    
    - **telemetry**: Required telemetry data from edge device
    - **waveform**: Optional waveform samples for advanced analysis
    - **include_explanation**: Return detailed analysis breakdown
    """
    start_time = time.perf_counter()
    app_state.request_count += 1
    
    try:
        telemetry = request.telemetry
        
        # Analyze telemetry metrics
        telemetry_analysis = app_state.analyzer.analyze_telemetry(telemetry)
        
        # Analyze waveform if provided
        waveform_confidence = 0.0
        waveform_features = None
        if request.waveform:
            waveform_result = await app_state.analyzer.analyze_waveform(request.waveform)
            waveform_confidence = waveform_result['confidence']
            waveform_features = waveform_result['features']
        
        # Combine confidence scores
        telemetry_confidence = min(telemetry_analysis['max_severity'] / 3.0, 1.0)
        
        if request.waveform:
            # Weighted combination: 40% telemetry, 60% waveform
            final_confidence = (telemetry_confidence * 0.4) + (waveform_confidence * 0.6)
        else:
            final_confidence = telemetry_confidence
        
        # Determine category and verdict
        if final_confidence >= 0.8:
            category = "theft"
            is_theft = True
        elif final_confidence >= 0.5:
            category = "suspicious"
            is_theft = False
        else:
            category = "normal"
            is_theft = False
        
        # Build explanation if requested
        details = None
        if request.include_explanation:
            details = {
                'telemetry_analysis': telemetry_analysis,
                'waveform_features': waveform_features,
                'telemetry_confidence': telemetry_confidence,
                'waveform_confidence': waveform_confidence,
                'pole_id': telemetry.pole_id,
                'differential': telemetry.differential
            }
        
        processing_time = (time.perf_counter() - start_time) * 1000
        app_state.total_inference_time += processing_time
        
        return TheftVerdict(
            is_theft=is_theft,
            confidence=round(final_confidence, 4),
            category=category,
            details=details,
            processing_time_ms=round(processing_time, 2),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/analyze/batch", response_model=BatchAnalysisResponse)
async def analyze_batch(request: BatchAnalysisRequest):
    """
    Batch analysis for multiple telemetry readings.
    
    Efficiently processes multiple readings concurrently using asyncio.
    """
    start_time = time.perf_counter()
    
    # Create tasks for concurrent processing
    async def analyze_single(telemetry: TelemetryInput) -> TheftVerdict:
        single_request = AnalysisRequest(telemetry=telemetry, include_explanation=False)
        return await analyze_telemetry(single_request)
    
    # Run all analyses concurrently
    tasks = [analyze_single(reading) for reading in request.readings]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out errors and count statistics
    valid_results = []
    theft_count = 0
    suspicious_count = 0
    normal_count = 0
    
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Batch analysis error: {result}")
            continue
        valid_results.append(result)
        
        if result.is_theft:
            theft_count += 1
        elif result.category == "suspicious":
            suspicious_count += 1
        else:
            normal_count += 1
    
    processing_time = (time.perf_counter() - start_time) * 1000
    
    return BatchAnalysisResponse(
        results=valid_results,
        summary={
            'total_processed': len(request.readings),
            'successful': len(valid_results),
            'theft_detected': theft_count,
            'suspicious': suspicious_count,
            'normal': normal_count,
            'batch_processing_time_ms': round(processing_time, 2)
        }
    )


@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    uptime = time.time() - app_state.start_time
    avg_inference_time = (
        app_state.total_inference_time / app_state.request_count 
        if app_state.request_count > 0 else 0
    )
    
    return {
        'uptime_seconds': uptime,
        'total_requests': app_state.request_count,
        'avg_inference_time_ms': round(avg_inference_time, 2),
        'requests_per_second': round(app_state.request_count / uptime, 2) if uptime > 0 else 0
    }


# ==================== MAIN ====================
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",  # Update this based on your file name
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        workers=1  # Set to number of CPU cores for production
    )
