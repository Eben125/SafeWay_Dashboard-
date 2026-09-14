import json
import httpx
import asyncio
import os

PROJECT_ID = "safeway-d78b8"
API_KEY = "AIzaSyCPnErU9gGcoLkUL-JL-XEDN5XoiwRJEsU"
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

def to_firestore(val):
    if isinstance(val, str): return {"stringValue": val}
    if isinstance(val, bool): return {"booleanValue": val}
    if isinstance(val, int): return {"integerValue": str(val)}
    if isinstance(val, float): return {"doubleValue": val}
    if isinstance(val, dict): return {"mapValue": {"fields": {k: to_firestore(v) for k, v in val.items()}}}
    if isinstance(val, list): return {"arrayValue": {"values": [to_firestore(v) for v in val]}}
    if val is None: return {"nullValue": None}
    return {"stringValue": str(val)}

async def main():
    schema_path = os.path.join(os.path.dirname(__file__), 'firebase_schema.json')
    with open(schema_path, 'r') as f:
        data = json.load(f)

    print("Connecting to Firebase to create collections...")
    async with httpx.AsyncClient() as client:
        for collection, docs in data.items():
            for doc_id, doc_data in docs.items():
                url = f"{BASE_URL}/{collection}?documentId={doc_id}&key={API_KEY}"
                payload = {"fields": {k: to_firestore(v) for k, v in doc_data.items()}}
                
                print(f"Creating document '{doc_id}' in collection '{collection}'...")
                resp = await client.post(url, json=payload)
                
                if resp.status_code == 409:
                    # Document exists, use PATCH to update it
                    patch_url = f"{BASE_URL}/{collection}/{doc_id}?key={API_KEY}"
                    resp = await client.patch(patch_url, json=payload)
                    
                if resp.status_code in [200, 201]:
                    print(f" -> SUCCESS ({resp.status_code})")
                else:
                    print(f" -> FAILED ({resp.status_code}): {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
