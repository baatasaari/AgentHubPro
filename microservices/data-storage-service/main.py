#!/usr/bin/env python3
"""
Data Storage Service
Ultra-focused microservice for data storage operations only
Extracted from storage.ts storage logic
Target: <150 lines for maximum maintainability
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Data Storage Service", description="Ultra-focused data storage operations", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class StorageRequest(BaseModel):
    table: str
    operation: str  # create, read, update, delete
    data: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = None

class StorageResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    affected_rows: int
    operation_time_ms: float

# In-memory storage simulation
storage_tables = {
    "agents": {},
    "conversations": {},
    "customers": {},
    "analytics": {}
}

operation_logs = []

@app.get("/health")
async def health_check():
    total_records = sum(len(table) for table in storage_tables.values())
    return {"status": "healthy", "service": "data-storage", "total_records": total_records}

@app.post("/api/storage/execute")
async def execute_storage_operation(request: StorageRequest):
    """Execute storage operation"""
    try:
        start_time = datetime.now()
        
        if request.operation == "create":
            result = create_record(request.table, request.data)
        elif request.operation == "read":
            result = read_records(request.table, request.filters or {})
        elif request.operation == "update":
            result = update_records(request.table, request.data, request.filters or {})
        elif request.operation == "delete":
            result = delete_records(request.table, request.filters or {})
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        operation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log operation
        operation_logs.append({
            "table": request.table,
            "operation": request.operation,
            "affected_rows": result.get("affected_rows", 0),
            "operation_time_ms": round(operation_time, 2),
            "timestamp": datetime.now().isoformat()
        })
        
        response = StorageResponse(
            success=True,
            data=result.get("data"),
            affected_rows=result.get("affected_rows", 0),
            operation_time_ms=round(operation_time, 2)
        )
        
        logger.info(f"Executed {request.operation} on {request.table} in {operation_time:.2f}ms")
        return response.model_dump()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Storage operation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def create_record(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new record in table"""
    if table not in storage_tables:
        storage_tables[table] = {}
    
    # Generate ID if not provided
    if "id" not in data:
        data["id"] = len(storage_tables[table]) + 1
    
    # Add timestamps
    data["created_at"] = datetime.now().isoformat()
    data["updated_at"] = datetime.now().isoformat()
    
    record_id = data["id"]
    storage_tables[table][record_id] = data
    
    return {
        "data": data,
        "affected_rows": 1
    }

def read_records(table: str, filters: Dict[str, Any]) -> Dict[str, Any]:
    """Read records from table with filters"""
    if table not in storage_tables:
        return {"data": [], "affected_rows": 0}
    
    records = list(storage_tables[table].values())
    
    # Apply filters
    if filters:
        filtered_records = []
        for record in records:
            matches = True
            for key, value in filters.items():
                if key not in record or record[key] != value:
                    matches = False
                    break
            if matches:
                filtered_records.append(record)
        records = filtered_records
    
    return {
        "data": records,
        "affected_rows": len(records)
    }

def update_records(table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
    """Update records in table"""
    if table not in storage_tables:
        return {"affected_rows": 0}
    
    updated_count = 0
    
    for record_id, record in storage_tables[table].items():
        # Check if record matches filters
        matches = True
        for key, value in filters.items():
            if key not in record or record[key] != value:
                matches = False
                break
        
        if matches:
            # Update record
            for key, value in data.items():
                if key != "id":  # Don't allow ID updates
                    record[key] = value
            record["updated_at"] = datetime.now().isoformat()
            updated_count += 1
    
    return {"affected_rows": updated_count}

def delete_records(table: str, filters: Dict[str, Any]) -> Dict[str, Any]:
    """Delete records from table"""
    if table not in storage_tables:
        return {"affected_rows": 0}
    
    to_delete = []
    
    for record_id, record in storage_tables[table].items():
        # Check if record matches filters
        matches = True
        for key, value in filters.items():
            if key not in record or record[key] != value:
                matches = False
                break
        
        if matches:
            to_delete.append(record_id)
    
    # Delete matching records
    for record_id in to_delete:
        del storage_tables[table][record_id]
    
    return {"affected_rows": len(to_delete)}

@app.get("/api/storage/tables")
async def list_tables():
    """List all tables and their record counts"""
    table_info = {}
    for table_name, table_data in storage_tables.items():
        table_info[table_name] = {
            "record_count": len(table_data),
            "last_updated": max([record.get("updated_at", "") for record in table_data.values()], default="never")
        }
    
    return {"tables": table_info, "total_tables": len(storage_tables)}

@app.get("/api/storage/table/{table_name}")
async def get_table_info(table_name: str):
    """Get detailed information about a table"""
    if table_name not in storage_tables:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table_data = storage_tables[table_name]
    
    return {
        "table_name": table_name,
        "record_count": len(table_data),
        "records": list(table_data.values()),
        "sample_record": list(table_data.values())[0] if table_data else None
    }

@app.get("/api/storage/stats")
async def get_storage_stats():
    """Get storage operation statistics"""
    total_operations = len(operation_logs)
    
    if total_operations == 0:
        return {"message": "No operations logged"}
    
    avg_operation_time = sum(log["operation_time_ms"] for log in operation_logs) / total_operations
    
    # Operation breakdown
    operation_counts = {}
    for log in operation_logs:
        op = log["operation"]
        operation_counts[op] = operation_counts.get(op, 0) + 1
    
    # Table access frequency
    table_access = {}
    for log in operation_logs:
        table = log["table"]
        table_access[table] = table_access.get(table, 0) + 1
    
    return {
        "total_operations": total_operations,
        "average_operation_time_ms": round(avg_operation_time, 2),
        "operation_breakdown": operation_counts,
        "table_access_frequency": table_access
    }

@app.delete("/api/storage/table/{table_name}")
async def clear_table(table_name: str):
    """Clear all records from a table"""
    if table_name not in storage_tables:
        raise HTTPException(status_code=404, detail="Table not found")
    
    cleared_count = len(storage_tables[table_name])
    storage_tables[table_name] = {}
    
    logger.info(f"Cleared {cleared_count} records from table {table_name}")
    return {"success": True, "cleared_records": cleared_count}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8128))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)