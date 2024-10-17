<p align="center">
  <img width="20%" src="https://files.alan0.com/noseats.png" />
</p>

---

<p align="center">
  <h3 align="center">Automated Seats Attendance System</h3>
</p>

--- 


## **Overview**

This project demonstrates the poorly made [Seats](https://www.seatssoftware.com/education-technology/seats-mobile-app-for-students/) attendance system, which allows for automated check-ins using API calls.

## **Warning**

This is purely eductional, I will not be explaining how to capture your bearer token.



## **Table of Contents**

- [Features](#features)
- [Technical Details](#technical-details)
- [Installation](#installation)
- [Usage](#usage)
- [Admin Dashboard](#admin-dashboard)
- [Terminal Output](#terminal-output)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)

---

## **Features**

- Automates attendance check-ins for scheduled events or lessons.
- Supports multiple users with individual authentication tokens.
- Admin dashboard for managing users and viewing scheduled check-ins.
- Randomized check-in times to mimic human behavior.
- Logs actions and responses for monitoring purposes.

---

## **Admin Dashboard**

![Admin Dashboard Screenshot](https://files.alan0.com/dashboard.png) <!-- Replace '#' with the path to your admin dashboard image -->

The admin dashboard provides an interface for:

- Managing user tokens.
- Viewing user details fetched from the API.
- Monitoring upcoming check-ins for each user.
- Viewing statistics like total users and upcoming check-ins.

---

## **Terminal Output**

![Terminal Output Screenshot](https://files.alan0.com/terminalExample.png) <!-- Replace '#' with the path to your terminal output image -->

The terminal displays real-time logs of the server's operations, including:

- Scheduled check-ins with timestamps.
- API request and response statuses.
- Error messages for troubleshooting.

---

## **Technical Details**

The project consists of a Node.js backend using Express and a frontend admin dashboard.

### **How It Works**

1. **User Management:**
   - Users are identified by unique IDs and associated with bearer tokens used for API authentication.
   - Tokens are stored securely on the server.

2. **Scheduling Check-Ins:**
   - The server fetches each user's scheduled lessons from the API.
   - For each lesson, it schedules a check-in 5 minutes before the lesson starts.
   - A random offset of ±60 seconds is added to the check-in time to simulate human behavior.

3. **Automated Check-Ins:**
   - At the scheduled time, the server sends a check-in request to the API on behalf of the user.
   - Responses are logged, and any errors are reported.

4. **Admin Dashboard:**
   - A web interface to add or remove users and view upcoming check-ins.
   - Displays statistics like total users and total upcoming check-ins.

---

## **Installation**

### **Prerequisites**

- **Node.js** and **npm** installed on your system.
- **Git** installed for cloning the repository.

### **Steps**

1. **Clone the Repository**

   ```bash
   git clone https://github.com/koterba/seats-automation.git
   cd seats-automation
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure the Application**

   - No additional configuration is required unless modifying API endpoints or server settings.

4. **Run the Server**

   ```bash
   node app.js
   ```

5. **Access the Admin Dashboard**

   - Open a web browser and navigate to `http://localhost:1911/admin.html`

---

## **Usage**

1. **Add Users**

   - In the admin dashboard, enter the **Student ID** and **Bearer Token** for each user.
   - Click **Add Token** to save the user.

2. **View Scheduled Check-Ins**

   - Select a user from the dropdown to view their upcoming check-ins.
   - The dashboard displays the lesson title and expected check-in time.

3. **Monitor Logs**

   - Check the terminal output to monitor the server's activity.
   - Logs include scheduling information and API responses.

---

## **Disclaimer**

**This project is intended for educational and demonstration purposes only.** The exploit showcases a security vulnerability that should be addressed by the company. Unauthorized use of this code against systems without explicit permission is illegal and unethical.

---

## **Contributing**

Contributions are welcome. Please create an issue or pull request for any changes or enhancements.

---

## **License**

This project is licensed under the [MIT License](LICENSE).
