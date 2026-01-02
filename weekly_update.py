import os
import requests
from supabase import create_client, Client
import resend

# --- CONFIGURATION ---
# Load these from environment variables for security!
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") # Use Service Role Key for backend writes
NEWS_API_KEY = os.environ.get("NEWS_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

# Initialize Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
resend.api_key = RESEND_API_KEY

def fetch_ai_news():
    """Fetches latest AI news from NewsAPI"""
    url = f'https://newsapi.org/v2/everything?q=artificial+intelligence&language=en&sortBy=publishedAt&apiKey={NEWS_API_KEY}&pageSize=20'
    response = requests.get(url)
    data = response.json()
    return data.get('articles', [])

def update_database(articles):
    """Inserts new articles into Supabase"""
    count = 0
    for article in articles:
        # Check if article already exists to prevent duplicates
        existing = supabase.table('news').select("*").eq('title', article['title']).execute()
        
        if not existing.data:
            # Map NewsAPI fields to our DB fields
            new_row = {
                "title": article['title'],
                "summary": article['description'],
                "content": article['content'] or article['description'], # Fallback
                "image_url": article['urlToImage'],
                "category": "AI Update",
                "published_at": article['publishedAt']
            }
            supabase.table('news').insert(new_row).execute()
            count += 1
    return count

def send_newsletter(new_articles_count):
    """Fetches subscribers and sends email"""
    # Get subscribers
    subs = supabase.table('subscribers').select("email").execute()
    subscriber_emails = [sub['email'] for sub in subs.data]

    if not subscriber_emails:
        print("No subscribers found.")
        return

    # Create HTML Email Content
    html_content = f"""
    <h1>Weekly AI Update</h1>
    <p>We found {new_articles_count} new stories this week.</p>
    <p>Check them out at <a href="https://your-website-url.com">NexusAI</a>.</p>
    """

    # Send via Resend
    params = {
        "from": "NexusAI <onboarding@resend.dev>", # Use your verified domain later
        "to": subscriber_emails,
        "subject": "This Week in AI: New Arrivals",
        "html": html_content,
    }
    
    try:
        r = resend.Emails.send(params)
        print(f"Email sent! ID: {r}")
    except Exception as e:
        print(f"Error sending email: {e}")

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    print("Starting Forced Test...")
    
    # Create a fake news item
    test_article = {
        "title": "SYSTEM TEST: Your Site is Working!",
        "description": "If you can read this, the connection between GitHub and Supabase is perfect.",
        "content": "This confirms your database is accepting data.",
        "urlToImage": "https://picsum.photos/seed/success/600/400",
        "publishedAt": "2023-10-27T12:00:00Z"
    }
    
    print("Updating database with test article...")
    # Force update with just this one item
    update_database([test_article])
    
    print("Done! Check your Supabase.")
