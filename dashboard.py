from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
from typing import List

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class PredictionItem(BaseModel):
    date: str
    storeId: str
    productId: str
    actual: float
    predicted: float
    error: float

class MetricsData(BaseModel):
    mape: float
    totalPredictions: int
    accuracy: float
    totalRows: int
    totalStores: int
    totalProducts: int

class DashboardResponse(BaseModel):
    predictions: List[PredictionItem]
    metrics: MetricsData

@app.get("/")
def read_root():
    return {
        "message": "Dashboard Forecasting API is running",
        "port": 8001
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/upload-forecast", response_model=DashboardResponse)
async def upload_forecast(file: UploadFile = File(...)):
    """
    Upload CSV and return simulated predictions
    Expected CSV columns: Date, Store ID, Product ID, Demand Forecast
    """
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # Validate required columns
        required_cols = ['Date', 'Store ID', 'Product ID', 'Demand Forecast']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_cols)}"
            )

        # Simulate ML predictions: Add random noise to actual demand
        np.random.seed(42)
        df['Predicted_Demand'] = df['Demand Forecast'] * (1 + np.random.normal(0, 0.08, len(df)))
        
        # Calculate error percentage
        df['Error'] = abs(df['Demand Forecast'] - df['Predicted_Demand']) / (df['Demand Forecast'] + 1e-8) * 100

        # Create predictions list
        predictions_list = []
        for _, row in df.iterrows():
            predictions_list.append(
                PredictionItem(
                    date=str(row['Date']),
                    storeId=str(row['Store ID']),
                    productId=str(row['Product ID']),
                    actual=float(row['Demand Forecast']),
                    predicted=float(row['Predicted_Demand']),
                    error=float(row['Error']),
                )
            )

        # Calculate overall metrics
        mape = float(np.mean(df['Error']))
        
        metrics = MetricsData(
            mape=mape,
            totalPredictions=len(df),
            accuracy=float(100 - mape),
            totalRows=len(df),
            totalStores=int(df['Store ID'].nunique()),
            totalProducts=int(df['Product ID'].nunique()),
        )

        return DashboardResponse(predictions=predictions_list, metrics=metrics)
    
    except pd.errors.ParserError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV format. Please upload a valid CSV file."
        )
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Column error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
