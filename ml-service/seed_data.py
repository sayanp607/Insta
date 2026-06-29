import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("❌ ERROR: MONGO_URI not found in .env")
    exit()

client = MongoClient(MONGO_URI)
db = client.get_database()

print("🌱 Starting Database Seeder...")

# 1. Find the users
creator = db.users.find_one({"email": "c@gmail.com"})
main_user = db.users.find_one({"email": {"$regex": "sayan@.*gmail.com", "$options": "i"}})

if not creator:
    print("❌ ERROR: Could not find creator user 'c@gmail.com'")
    exit()
    
if not main_user:
    print("❌ ERROR: Could not find main user 'sayan@gmail.com'")
    exit()

print(f"✅ Found Creator: {creator['username']}")
print(f"✅ Found Main User: {main_user['username']}")

# 2. Define the dummy posts
# We will add Football posts (Messi/Ronaldo) AND Nature/Car posts.
# This proves the ML works by filtering OUT the nature/cars and keeping football at the top!
dummy_posts = [
    # --- FOOTBALL POSTS ---
    {
        "caption": "The GOAT doing what he does best! 🐐⚽",
        "image": "https://images.unsplash.com/photo-1518091043644-c1d44570a2c9?w=800", # generic football/stadium
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["football", "soccer", "messi", "goat", "sports", "stadium"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    {
        "caption": "CR7! What a legend. 🔥",
        "image": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800", # football on pitch
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["football", "soccer", "ronaldo", "sports", "athlete", "pitch"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    {
        "caption": "Champions League nights are different. 🏆",
        "image": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800", # trophy/stadium
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["football", "champions", "league", "sports", "stadium", "night"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    {
        "caption": "Neymar skills magic ✨",
        "image": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800", # player dribbling
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["football", "soccer", "neymar", "skills", "sports", "brazil"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    
    # --- NON-FOOTBALL POSTS (To test that ML pushes these to the bottom) ---
    {
        "caption": "Peaceful morning in the mountains 🏔️",
        "image": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["nature", "mountains", "peaceful", "landscape", "morning", "trees"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    {
        "caption": "Dream car right here! 🏎️💨",
        "image": "https://images.unsplash.com/photo-1503376710356-7386af20a5d5?w=800",
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["cars", "speed", "sports", "vehicle", "fast", "luxury"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    },
    {
        "caption": "Delicious pasta dinner 🍝",
        "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",
        "author": creator["_id"],
        "mediaType": "image",
        "aiTags": ["food", "pasta", "dinner", "delicious", "restaurant", "italian"],
        "likes": [], "comments": [], "createdAt": datetime.now(), "updatedAt": datetime.now()
    }
]

print(f"📥 Inserting {len(dummy_posts)} posts into database...")
result = db.posts.insert_many(dummy_posts)
inserted_ids = result.inserted_ids

# Add the new posts to the Creator's user document
db.users.update_one(
    {"_id": creator["_id"]},
    {"$push": {"posts": {"$each": inserted_ids}}}
)

print("📌 Bookmarking 2 Football posts for your Main Account...")
# We will grab the first two inserted IDs (which are the Messi and Ronaldo posts!)
football_post_ids = inserted_ids[0:2]

db.users.update_one(
    {"_id": main_user["_id"]},
    {"$addToSet": {"bookmarks": {"$each": football_post_ids}}}
)

print("🎉 Seeding Complete! Go check your Explore page now!")
