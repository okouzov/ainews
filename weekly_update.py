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
    # A list of high-quality, reliable tech sources
    trusted_domains = "techcrunch.com,theverge.com,wired.com,arstechnica.com,engadget.com,reuters.com,bloomberg.com"
    
    # A smarter search query (using boolean operators)
    # This looks for articles mentioning AI OR Generative AI OR OpenAI, etc.
    search_query = "(artificial intelligence OR generative AI OR OpenAI OR Nvidia OR LLM)"
    
    # Construct the URL
    url = (
        f'https://newsapi.org/v2/everything?'
        f'q={search_query}&'
        f'domains={trusted_domains}&'  # Restricts to these sites only
        f'language=en&'
        f'sortBy=publishedAt&'
        f'apiKey={NEWS_API_KEY}&'
        f'pageSize=20'
    )
    
    response = requests.get(url)
    data = response.json()
    
    # Debug print so you can see what's happening in the logs
    print(f"Fetched {len(data.get('articles', []))} articles from trusted sources.")
    
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
            "content": article['content'] or article['description'],
            "image_url": article['urlToImage'],
            "category": "AI Update",
            "published_at": article['publishedAt'],
            "source_url": article['url']  # <--- ADD THIS LINE
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
    print("Fetching news...")
    articles = fetch_ai_news()
    
    print("Updating database...")
    added_count = update_database(articles)
    
    if added_count > 0:
        print(f"Added {added_count} new articles. Sending newsletter...")
        send_newsletter(added_count)
    else:
        print("No new articles found. Skipping email.")



