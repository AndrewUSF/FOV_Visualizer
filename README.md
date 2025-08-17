# FOV Visualizer

Explore how different fields of view feel on screen. Move the sliders to change the horizontal, vertical, or diagonal field of view and see the result instantly.

Open the app: https://andrewusf.github.io/FOV_Visualizer/

## What you can do

- Choose a control mode (set any two: Horizontal + Vertical, Horizontal + Diagonal, or Vertical + Diagonal) and the app fills in the third automatically
- Use easy sliders and number boxes for fine adjustments
- Pick common screen shapes (16:9, 4:3, 1:1, 21:9) or enter your own
- Change the overall scale to make the view bigger or smaller
- Toggle visual helpers: grid, simple room backdrop, diagonal lines, and dimming outside the view

## How to use it

1) Open the app link above
2) Pick a control mode (which two values you want to set)
3) Move the sliders or type numbers—your view updates right away
4) Choose an aspect ratio preset or enter your own width:height
5) Turn helpers on or off to match your preference

## Works in your browser

The tool runs in modern browsers like Chrome, Edge, Firefox, and Safari.

## Feedback

Spotted an issue or have an idea to improve it? Feel free to open an issue or share feedback.

## Clone and run locally

Prerequisites: Git and a modern browser. A simple local server is optional but recommended.

1) Clone the repository

```bash
git clone https://github.com/AndrewUSF/FOV_Visualizer.git
```

2) Move into the project directory

```bash
cd FOV_Visualizer
```

3) Run it locally (pick one)

- Option A: Open `index.html` directly in your browser
- Option B: Serve with a simple local server
  - Python (3.x):
    ```bash
    python3 -m http.server 8000
    ```
    Then open http://localhost:8000 in your browser
  - Node (npx):
    ```bash
    npx serve -l 8000
    ```
    Then open http://localhost:8000 in your browser
