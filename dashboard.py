from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import io

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/process-csv")
async def process_csv(file: UploadFile = File(...)):
    try:
        # Read the uploaded CSV file
        contents = await file.read()
        csv_text = contents.decode('utf-8')
        
        # For now, just return the same CSV
        # Later you can add your processing logic here
        
        return PlainTextResponse(content=csv_text, media_type="text/csv")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
