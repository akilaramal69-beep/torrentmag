# PikPak Magnet Downloader

A simple web application to add magnet links to PikPak, running in a Docker container.

## Features
- **Add Magnet Links**: Quickly add magnet links to your PikPak account.
- **User Isolation**: Users only see the files they added (session-based).
- **CAPTCHA Handling**: Prompts for CAPTCHA solution when required by PikPak login.
- **Dockerized**: Easy deployment with a single command.

## Prerequisites
- Docker and Docker Compose installed.
- Valid PikPak account credentials.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/akilaramal69-beep/torrentmag.git
    cd torrentmag
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory (or update the existing one) with your credentials:
    ```env
    PIKPAK_USER=your_email@example.com
    PIKPAK_PASS=your_password
    PORT=3000
    ```

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the Application:**
    Open your browser and navigate to `http://localhost:3000`.

## API Endpoints

-   `POST /api/magnet`: Add a magnet link.
-   `GET /api/files/:taskId`: Check the status of a specific task.
-   `POST /api/captcha`: Submit a CAPTCHA token to solve login challenge.

## Development

To run locally without Docker:

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the server:
    ```bash
    node src/server.js
    ```
