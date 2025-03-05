import sys
import json
import google.generativeai as genai

# Configure Gemini API
API_KEY = "AIzaSyD27uP7f9yxSEf-qI0NkOOAB50Fo-rmEBI"
genai.configure(api_key=API_KEY)

def compare_documents(query_content, db_content):
    """Use Gemini API to compare two documents and return a similarity score."""
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""
    Compare the following two documents and provide a similarity score between 0 and 1,
    where 1 means identical and 0 means completely dissimilar. Return only the score as a float.

    Document 1: {query_content}
    Document 2: {db_content}
    """
    response = model.generate_content(prompt)
    try:
        score = float(response.text.strip())
        return score
    except ValueError:
        return 0.0

def find_matches(query_content, db_files):
    """Find matching documents from the uploads folder with similarity > 50%."""
    matches = []
    for file in db_files:
        if file['filename'] != query_content['filename']:  # Skip the query file itself
            score = compare_documents(query_content['content'], file['content'])
            if score > 0.5:
                matches.append({
                    'id': None,  # No database ID needed
                    'filename': file['filename'],
                    'similarity': score,
                    'source': 'Gemini'
                })
    return matches

def main():
    # Read input from Node.js via stdin
    input_data = sys.stdin.read()
    data = json.loads(input_data)

    query_content = data['query_content']
    db_files = data['db_files']

    # Find matches
    matches = find_matches(query_content, db_files)

    # Output results as JSON to stdout
    print(json.dumps(matches))

if __name__ == "__main__":
    main()