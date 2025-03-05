# Cathago Document Scanner

Cathago Document Scanner is a modern web application designed to upload, scan, and match text documents against a reference set, featuring a sleek dark-themed interface with 3D particle effects and advanced analytics. Built with Node.js, Express, SQLite, and Three.js, it offers both user and admin dashboards with smart features like document similarity matching, credit management, and detailed usage statistics.

## Features

### General
- **Dark Theme UI**: A visually appealing dark theme with a `night-sky.jpg` background and 3D particle animations.
- **Document Matching**: Compares uploaded text files against a reference set in the `uploads/` folder using Levenshtein distance and Google Gemini API (80% accuracy).
- **File Storage**: User uploads are stored in an SQLite database; admin uploads go to the `uploads/` folder.

### User Dashboard
- **Upload & Match**: Users can upload `.txt` files and view matches with similarity scores (>50%) from both Levenshtein and Gemini algorithms.
- **Download Matches**: Download matched files from the `uploads/` folder.
- **Daily Scan Limit**: 20 free scans per day, resetting at midnight.
- **Analytics**: Displays daily scans (progress bar) and top scanned topics.

### Admin Dashboard
- **Credit Management**: Adjust user credits by username and approve/deny credit requests.
- **Reference Upload**: Upload files to the `uploads/` folder for matching.
- **Analytics Table**: View detailed stats in a styled table:
  - Top users by scans and credits.
  - Most common scanned document topics.
  - Daily scan counts per user.
  - Credit usage statistics (requests and totals).

### UI/UX Enhancements
- **3D Effects**: Floating cards, glowing text, and interactive hover animations.
- **Responsive Design**: Adapts to various screen sizes with a card-based layout.
- **Icons & Tooltips**: Font Awesome icons and tooltips for better usability.

## Prerequisites
- **Node.js**: v22.14.0 or higher.
- **Python**: 3.x with `google-generativeai` module (`pip install google-generativeai`).
- **SQLite**: No external setup required (uses `database.sqlite`).

## Installation

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd cathago-doc-scanner
```

### **2. Install Node.js Dependencies**
```bash
npm install
```

### **3. Install Python Dependencies**
```bash
pip install google-generativeai
```

### **4. Add Assets**
- Place `night-sky.jpg` in `public/`.
- Download `three.min.js` from Three.js CDN and save it to `public/`.

### **5. Run the Server**
```bash
node src/server.js
```

### **6. Access the Application**
Open [http://localhost:3000](http://localhost:3000) in a browser.

---

## Usage

### **Login/Register**
- **Default Admin Credentials**:  
  - **Username**: `admin`  
  - **Password**: `123`  
- Users can register via the index page.

### **User Dashboard**
- Upload a `.txt` file to scan and see matches.
- View daily scans (progress bar) and top topics.
- Request credits or export scan history.

### **Admin Dashboard**
- View analytics in a table format.
- Approve/deny credit requests.
- Adjust user credits by username.
- Upload reference files to `uploads/`.

---

## File Structure
```
cathago-doc-scanner/
├── public/
│   ├── dashboard.html      # User dashboard UI
│   ├── admin.html          # Admin dashboard UI
│   ├── index.html          # Login/register page
│   ├── style.css           # Styling for all pages
│   ├── script.js           # Client-side JavaScript
│   ├── night-sky.jpg       # Background image
│   └── three.min.js        # Three.js for 3D particles
├── src/
│   ├── server.js           # Main Express server
│   ├── auth.js             # Authentication routes
│   ├── credit.js           # Credit management routes
│   ├── document.js         # Document upload and matching routes
│   ├── analytics.js        # Analytics routes
│   ├── db.js               # SQLite database setup
│   └── gemini_match.py     # Python script for Gemini API
├── uploads/                # Folder for reference files
├── database.sqlite         # SQLite database
└── README.md               # This file
```

---

## Setup Notes
- **Database**: Resets on server restart unless `database.sqlite` exists. Delete to start fresh.
- **Uploads Folder**: Pre-populate with `.txt` files (e.g., `s1.txt`) for matching.
- **Gemini API**: Uses key `AIzaSyD27uP7f9yxSEf-qI0NkOOAB50Fo-rmEBI`—replace if needed in `gemini_match.py`.

---

## Example Test

### **Pre-populate `uploads/`**
```powershell
echo "The quick brown fox leaps over the idle dog." > public\uploads\s1.txt
```

### **Run Server**
```powershell
node src/server.js
```

### **Log In as Test User**
- Upload `test.txt` with content:  
  `"The quick brown fox jumps over the resting dog."`
- **Expected Matches**:  
  - `s1.txt` - **81.82%** (Levenshtein)  
  - **80.00%** (Gemini)

---

## Contributing
- Fork the repository, make changes, and submit a pull request.
- Report issues or suggest features via the issue tracker.

---

## License
This project is **unlicensed**—use it freely for educational or personal purposes.
