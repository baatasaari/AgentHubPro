#!/usr/bin/env python3
"""
Database Operations Service
Ultra-focused microservice for database CRUD operations only
Target: <110 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Database Operations Service", description="Ultra-focused database operations", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class DatabaseRecord(BaseModel):
    table: str
    data: Dict[str, Any]
    id_field: str = "id"

class QueryRequest(BaseModel):
    table: str
    filters: Dict[str, Any] = {}
    limit: int = 100

# In-memory database simulation
database = {}

@app.get("/health")
async def health_check():
    table_count = len(database)
    total_records = sum(len(table_data) for table_data in database.values())
    return {"status": "healthy", "service": "database-operations", "tables": table_count, "records": total_records}

@app.post("/api/db/insert")
async def insert_record(record: DatabaseRecord):
    """Insert a record into database"""
    try:
        if record.table not in database:
            database[record.table] = {}
        
        # Generate ID if not provided
        if record.id_field not in record.data:
            record.data[record.id_field] = f"{record.table}_{len(database[record.table]) + 1}"
        
        record_id = record.data[record.id_field]
        record.data["created_at"] = datetime.now().isoformat()
        
        database[record.table][record_id] = record.data
        
        logger.info(f"Inserted record {record_id} into {record.table}")
        return {"success": True, "id": record_id, "table": record.table}
        
    except Exception as e:
        logger.error(f"Insert failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/db/query")
async def query_records(query: QueryRequest):
    """Query records from database"""
    try:
        if query.table not in database:
            return {"records": [], "total": 0, "table": query.table}
        
        table_data = database[query.table]
        matching_records = []
        
        for record_id, record_data in table_data.items():
            matches = True
            for filter_key, filter_value in query.filters.items():
                if filter_key not in record_data or record_data[filter_key] != filter_value:
                    matches = False
                    break
            
            if matches:
                matching_records.append(record_data)
        
        # Apply limit
        limited_records = matching_records[:query.limit]
        
        return {
            "records": limited_records,
            "total": len(matching_records),
            "returned": len(limited_records),
            "table": query.table
        }
        
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db/record/{table}/{record_id}")
async def get_record(table: str, record_id: str):
    """Get specific record"""
    if table not in database:
        raise HTTPException(status_code=404, detail="Table not found")
    
    if record_id not in database[table]:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return database[table][record_id]

@app.put("/api/db/update/{table}/{record_id}")
async def update_record(table: str, record_id: str, updates: Dict[str, Any]):
    """Update a record"""
    try:
        if table not in database or record_id not in database[table]:
            raise HTTPException(status_code=404, detail="Record not found")
        
        record = database[table][record_id]
        record.update(updates)
        record["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Updated record {record_id} in {table}")
        return {"success": True, "id": record_id, "table": table}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/db/delete/{table}/{record_id}")
async def delete_record(table: str, record_id: str):
    """Delete a record"""
    try:
        if table not in database or record_id not in database[table]:
            raise HTTPException(status_code=404, detail="Record not found")
        
        del database[table][record_id]
        
        logger.info(f"Deleted record {record_id} from {table}")
        return {"success": True, "deleted_id": record_id, "table": table}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db/tables")
async def list_tables():
    """List all tables"""
    tables_info = {}
    for table_name, table_data in database.items():
        tables_info[table_name] = len(table_data)
    
    return {"tables": tables_info, "total_tables": len(database)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8028))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)