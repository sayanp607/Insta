import os
import math
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId
from openai import OpenAI
from datetime import datetime
import joblib
import scipy.sparse as sp

load_dotenv()

app = FastAPI(title="NexaSocial ML Recommendation Service (Advanced)")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not MONGO_URI or not OPENAI_API_KEY:
    raise ValueError("Missing MONGO_URI or OPENAI_API_KEY in .env")

client = MongoClient(MONGO_URI)
db = client.get_database()
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Helper function to get OpenAI embeddings
def get_embedding(text: str):
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

@app.get("/")
def root():
    return {"status": "ML Service is running", "algorithm": "Hybrid (Embeddings + Weights + Time Decay + CF)"}

# Load the custom toxic comment classifier model
try:
    word_tfidf = joblib.load("pkl files/word_tfidf.pkl")
    char_tfidf = joblib.load("pkl files/char_tfidf.pkl")
    toxic_model = joblib.load("pkl files/model.pkl")
    print("Custom Toxic Comment Model loaded successfully.")
except Exception as e:
    print("Warning: pkl files not found or failed to load.", e)
    toxic_model = None

class ModerationRequest(BaseModel):
    text: str

@app.post("/moderate")
def moderate_text(request: ModerationRequest):
    if not toxic_model:
        raise HTTPException(status_code=500, detail="Toxic comment model is not loaded.")
    
    word_features = word_tfidf.transform([request.text])
    char_features = char_tfidf.transform([request.text])
    combined_features = sp.hstack([word_features, char_features])
    
    # Get raw prediction (could be a scalar or an array of labels)
    raw_prediction = toxic_model.predict(combined_features)[0]
    
    # Safely convert to boolean regardless of whether it's an array or scalar
    import numpy as np
    if isinstance(raw_prediction, (list, tuple, np.ndarray)):
        is_toxic = bool(np.any(np.array(raw_prediction) == 1))
    else:
        is_toxic = bool(raw_prediction == 1)
    
    # Optional: get probabilities to show confidence
    try:
        probabilities = toxic_model.predict_proba(combined_features)
        if isinstance(probabilities, list):
            # Multi-label case: get max probability across all labels
            toxic_probability = float(max([p[0][1] for p in probabilities]))
        else:
            # Binary case
            toxic_probability = float(probabilities[0][1])
    except:
        toxic_probability = 1.0 if is_toxic else 0.0
    
    return {
        "flagged": is_toxic,
        "toxic_probability": toxic_probability,
        "categories": ["custom_ml_toxicity"] if is_toxic else []
    }

@app.get("/recommend/{user_id}")
def recommend_posts(user_id: str, limit: int = 10):
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # ==========================================
        # 1. IMPLICIT FEEDBACK (Weighted Scoring)
        # ==========================================
        user_bookmarks = user.get("bookmarks", [])
        
        # Query posts the user interacted with
        interacted_posts = list(db.posts.find({
            "$or": [
                {"_id": {"$in": user_bookmarks}},
                {"likes": ObjectId(user_id)}
            ]
        }))
        
        # ==========================================
        # 2. OPENAI EMBEDDINGS (Semantic Meaning)
        # ==========================================
        user_vectors = []
        user_weights = []
        
        for p in interacted_posts:
            tags = " ".join(p.get("aiTags", []))
            if not tags: continue
            
            weight = 1 # Base weight to prevent division by zero
            str_id = str(p["_id"])
            str_bookmarks = [str(b) for b in user_bookmarks]
            str_likes = [str(l) for l in p.get("likes", [])]
            
            if str_id in str_bookmarks: weight += 3
            if str(user_id) in str_likes: weight += 1
            
            # Fetch 1536-dimensional semantic vector
            vector = get_embedding(tags)
            user_vectors.append(vector)
            user_weights.append(weight)
            
        # Fetch candidate posts
        all_posts = list(db.posts.find({"aiTags": {"$exists": True, "$not": {"$size": 0}}}))
        candidate_posts = [p for p in all_posts if p["_id"] not in user_bookmarks]
        
        if not user_vectors or not candidate_posts:
            return {"recommended_post_ids": [str(p["_id"]) for p in candidate_posts[:limit]], "fallback": True}
            
        # Weighted Average to create the User's "Taste Profile Vector"
        user_vectors = np.array(user_vectors)
        user_weights = np.array(user_weights).reshape(-1, 1)
        user_profile_vector = np.sum(user_vectors * user_weights, axis=0) / np.sum(user_weights)
        
        candidate_ids = []
        final_scores = []
        
        for p in candidate_posts:
            tags = " ".join(p.get("aiTags", []))
            if not tags: continue
            
            candidate_vector = get_embedding(tags)
            
            # Content Score (Cosine Similarity)
            content_score = cosine_similarity([user_profile_vector], [candidate_vector])[0][0]
            
            # ==========================================
            # 3. TIME DECAY (Freshness factor)
            # ==========================================
            # e^(-lambda * days_old) -> Posts lose 5% of their score per day
            days_old = (datetime.now() - p["createdAt"]).days
            decay_factor = math.exp(-0.05 * max(days_old, 0))
            
            # ==========================================
            # 4. COLLABORATIVE FILTERING (Hybrid Boost)
            # ==========================================
            # Boost score if a lot of OTHER people engaged with it (Crowd validation)
            total_engagement = len(p.get("likes", [])) + len(p.get("comments", []))
            cf_boost = min(total_engagement * 0.05, 0.2) # Max 20% boost from crowd
            
            # Final Hybrid Formula combining all 4 elements
            final_score = (content_score * decay_factor) + cf_boost
            
            candidate_ids.append(str(p["_id"]))
            final_scores.append(final_score)
            
        # Sort by final hybrid score descending
        top_indices = np.argsort(final_scores)[::-1][:limit]
        recommended_post_ids = [candidate_ids[i] for i in top_indices]

        return {
            "recommended_post_ids": recommended_post_ids,
            "fallback": False
        }

    except Exception as e:
        print(f"ML Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend_users/{user_id}")
def recommend_users(user_id: str, limit: int = 5):
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user_following = user.get("following", [])
        
        # 1. GRAPH LINK PREDICTION (Triadic Closure / Mutual Friends)
        mutual_candidates = {} 
        
        for following_id in user_following:
            followed_user = db.users.find_one({"_id": following_id})
            if followed_user:
                for second_degree_id in followed_user.get("following", []):
                    # Don't recommend myself, or someone I already follow
                    if second_degree_id != ObjectId(user_id) and second_degree_id not in user_following:
                        str_id = str(second_degree_id)
                        mutual_candidates[str_id] = mutual_candidates.get(str_id, 0) + 1
        
        # 2. TASTE PROFILE MATCHING (Content Embeddings)
        user_bookmarks = user.get("bookmarks", [])
        interacted_posts = list(db.posts.find({
            "$or": [
                {"_id": {"$in": user_bookmarks}},
                {"likes": ObjectId(user_id)}
            ]
        }))
        
        user_profile_vector = None
        if interacted_posts:
            user_vectors = []
            user_weights = []
            for p in interacted_posts:
                tags = " ".join(p.get("aiTags", []))
                if tags:
                    weight = 3 if p["_id"] in user_bookmarks else 1
                    user_vectors.append(get_embedding(tags))
                    user_weights.append(weight)
            
            if user_vectors:
                user_vectors = np.array(user_vectors)
                user_weights = np.array(user_weights).reshape(-1, 1)
                user_profile_vector = np.sum(user_vectors * user_weights, axis=0) / np.sum(user_weights)

        # Evaluate all other users I don't follow
        all_other_users = list(db.users.find({"_id": {"$ne": ObjectId(user_id), "$nin": user_following}}))
        
        final_user_scores = []
        final_user_ids = []
        
        for other_user in all_other_users:
            str_id = str(other_user["_id"])
            score = 0.0
            
            # Base score from mutual friends
            if str_id in mutual_candidates:
                score += (mutual_candidates[str_id] * 0.2) # 20% boost per mutual friend
                
            # Content similarity score (Does this user post things I like?)
            if user_profile_vector is not None:
                other_user_posts = list(db.posts.find({"author": other_user["_id"], "aiTags": {"$exists": True}}))
                if other_user_posts:
                    other_tags = " ".join([tag for p in other_user_posts for tag in p.get("aiTags", [])])
                    if other_tags:
                        other_vector = get_embedding(other_tags)
                        content_score = cosine_similarity([user_profile_vector], [other_vector])[0][0]
                        score += content_score
                        
            final_user_scores.append(score)
            final_user_ids.append(str_id)
            
        if not final_user_ids:
            return {"recommended_user_ids": [], "fallback": True}
            
        # Sort users by final hybrid score
        top_indices = np.argsort(final_user_scores)[::-1][:limit]
        recommended_user_ids = [final_user_ids[i] for i in top_indices]

        return {
            "recommended_user_ids": recommended_user_ids,
            "fallback": False
        }

    except Exception as e:
        print(f"ML Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GenerateImageRequest(BaseModel):
    prompt: str
    provider: str = "pollinations"

@app.post("/generate_image")
async def generate_image(request: GenerateImageRequest):
    try:
        import urllib.parse
        import requests
        import base64
        
        if request.provider == "clipdrop":
            clipdrop_key = os.getenv("CLIPDROP_API_KEY")
            if not clipdrop_key:
                raise Exception("Please add CLIPDROP_API_KEY to the backend .env file first!")
                
            res = requests.post(
                "https://clipdrop-api.co/text-to-image/v1",
                files={"prompt": (None, request.prompt, "text/plain")},
                headers={"x-api-key": clipdrop_key}
            )
            if res.status_code != 200:
                raise Exception(f"Clipdrop API Error: {res.text}")
            image_bytes = res.content
            
        else:
            # Format the prompt for URL
            safe_prompt = urllib.parse.quote(request.prompt)
            # Use Pollinations.ai
            image_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=1024&height=1024&nologo=true&seed={np.random.randint(1, 1000000)}"
            res = requests.get(image_url)
            if res.status_code != 200:
                raise Exception("Failed to fetch AI image")
            image_bytes = res.content
            
        base64_img = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{base64_img}"
        
        return {"success": True, "image_url": data_url}
    except Exception as e:
        print(f"AI Image Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
