import asyncio
import time
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status

from ..models import (
    AnalysisRequest, TheftVerdict, HealthResponse, 
    BatchAnalysisRequest, BatchAnalysisResponse, TelemetryInput
)
from ..core.state import app_state
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# simple health check
@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime_seconds=time.time() - app_state.start_time,
        total_requests=app_state.request_count,
        model_loaded=app_state.analyzer.model_loaded
    )


# main analysis endpoint - called by .NET
@router.post("/analyze", response_model=TheftVerdict)
async def analyze_telemetry(request: AnalysisRequest):
    start_time = time.perf_counter()
    app_state.request_count += 1
    
    try:
        telemetry = request.telemetry
        telemetry_analysis = app_state.analyzer.analyze_telemetry(telemetry)
        
        # optional waveform analysis
        waveform_confidence = 0.0
        waveform_features = None
        if request.waveform:
            waveform_result = await app_state.analyzer.analyze_waveform(request.waveform)
            waveform_confidence = waveform_result['confidence']
            waveform_features = waveform_result['features']
        
        telemetry_confidence = min(telemetry_analysis['max_severity'] / 3.0, 1.0)
        
        # combine scores if we have waveform data
        if request.waveform:
            final_confidence = (telemetry_confidence * 0.4) + (waveform_confidence * 0.6)
        else:
            final_confidence = telemetry_confidence
        
        # determine category
        if final_confidence >= 0.8:
            category = "theft"
            is_theft = True
        elif final_confidence >= 0.5:
            category = "suspicious"
            is_theft = False
        else:
            category = "normal"
            is_theft = False
        
        # include details if requested
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


# batch processing for multiple readings
@router.post("/analyze/batch", response_model=BatchAnalysisResponse)
async def analyze_batch(request: BatchAnalysisRequest):
    start_time = time.perf_counter()
    
    async def analyze_single(telemetry: TelemetryInput) -> TheftVerdict:
        single_request = AnalysisRequest(telemetry=telemetry, include_explanation=False)
        return await analyze_telemetry(single_request)
    
    # run all in parallel
    tasks = [analyze_single(reading) for reading in request.readings]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
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


# stats for monitoring
@router.get("/stats")
async def get_stats():
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
