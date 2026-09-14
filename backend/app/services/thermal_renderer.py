import io
import math
import base64
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from typing import Tuple, List, Dict, Any

class ThermalRenderer:
    """
    Renders realistic synthetic Long-Wave Infrared (LWIR 8-14 um) camera frames
    using authentic Ironbow / Inferno thermographic pseudocolor mapping.
    Simulates night-time vehicle front perspective with hot pedestrians,
    exhaust heat signatures, and ambient road surfaces.
    """
    def __init__(self, width: int = 480, height: int = 320):
        self.width = width
        self.height = height
        self.step = 0
        self._build_ironbow_palette()

    def _build_ironbow_palette(self):
        """Generates a 256-color Ironbow thermography lookup table."""
        # Keypoints: [Black/Purple -> Violet -> Orange -> Yellow -> White]
        points = [
            (0.0, (10, 5, 25)),       # Very cold ambient (-5 to 10 C)
            (0.2, (50, 10, 85)),      # Cold sky / trees (15 C)
            (0.4, (140, 20, 110)),    # Ambient road surface (22 C)
            (0.65, (230, 85, 20)),    # Warm objects (30 C)
            (0.85, (255, 195, 30)),   # Body heat / engine block (37 - 50 C)
            (1.0, (255, 255, 250))    # Exhaust / brakes hot spot (70 - 95 C)
        ]
        
        palette = np.zeros((256, 3), dtype=np.uint8)
        for i in range(256):
            norm = i / 255.0
            # Interpolate between keypoints
            for k in range(len(points) - 1):
                p1, c1 = points[k]
                p2, c2 = points[k+1]
                if p1 <= norm <= p2:
                    t = (norm - p1) / (p2 - p1)
                    r = int(c1[0] + t * (c2[0] - c1[0]))
                    g = int(c1[1] + t * (c2[1] - c1[1]))
                    b = int(c1[2] + t * (c2[2] - c1[2]))
                    palette[i] = [r, g, b]
                    break
        self.palette = palette

    def render_frame(self, frame_id: int) -> Tuple[str, List[Dict[str, Any]], float, float]:
        """
        Renders a thermal frame and returns:
        (base64_jpeg_url, detections, ambient_temp_c, max_temp_c)
        """
        self.step = frame_id
        t = frame_id * 0.08
        
        # Create thermal intensity map (0-255 representing normalized temperature field)
        temp_map = np.zeros((self.height, self.width), dtype=np.float32)
        
        # 1. Sky & Background Horizon Gradient (cool 15 C ~ intensity 45)
        for y in range(self.height):
            if y < self.height * 0.45:
                # Sky gets slightly cooler towards top
                temp_map[y, :] = 35 + (y / (self.height * 0.45)) * 25
            else:
                # Road surface gradient (warm asphalt reflection ~ intensity 95-120)
                road_y = (y - self.height * 0.45) / (self.height * 0.55)
                temp_map[y, :] = 60 + road_y * 45

        # 2. Add perspective road perspective triangle
        road_mask = np.zeros((self.height, self.width), dtype=np.float32)
        horizon_y = int(self.height * 0.45)
        center_x = self.width // 2
        for y in range(horizon_y, self.height):
            progress = (y - horizon_y) / (self.height - horizon_y)
            half_w = int(20 + progress * (self.width * 0.42))
            x_left = max(0, center_x - half_w)
            x_right = min(self.width, center_x + half_w)
            temp_map[y, x_left:x_right] += 15.0

        # Convert to PIL Image for thermal objects rendering
        norm_img = Image.fromarray(np.clip(temp_map, 0, 255).astype(np.uint8), mode='L')
        draw = ImageDraw.Draw(norm_img)

        # 3. Dynamic Moving Objects (Heat Signatures)
        detections = []
        
        # Object A: Preceding Vehicle (Distance ~35m, warm exhaust 88 C, warm tires 48 C)
        car_x = int(center_x + math.sin(t * 0.5) * 25 - 35)
        car_y = int(horizon_y + 40 + math.cos(t * 0.3) * 5)
        car_w = 70
        car_h = 45
        
        # Draw vehicle body (warm ~170)
        draw.rounded_rectangle([car_x, car_y, car_x + car_w, car_y + car_h], radius=6, fill=165)
        # Vehicle exhaust pipes (intense hot spots ~250 = ~85 C)
        draw.ellipse([car_x + 10, car_y + car_h - 10, car_x + 22, car_y + car_h + 2], fill=255)
        draw.ellipse([car_x + car_w - 22, car_y + car_h - 10, car_x + car_w - 10, car_y + car_h + 2], fill=255)
        # Tires (friction heat ~205)
        draw.rounded_rectangle([car_x + 6, car_y + car_h - 18, car_x + 18, car_y + car_h - 4], radius=2, fill=210)
        draw.rounded_rectangle([car_x + car_w - 18, car_y + car_h - 18, car_x + car_w - 6, car_y + car_h - 4], radius=2, fill=210)

        detections.append({
            "label": "Vehicle",
            "confidence": 0.94 + 0.04 * math.sin(t),
            "bbox": [car_x - 5, car_y - 5, car_w + 10, car_h + 14],
            "temperature_c": round(84.2 + 2.5 * math.sin(t * 2), 1)
        })

        # Object B: Pedestrian on Roadside (Distance ~28m, Body Core 36.8 C)
        ped_base_x = int(center_x + 110 + math.sin(t * 0.8) * 15)
        ped_base_y = int(horizon_y + 55)
        ped_w = 18
        ped_h = 42

        # Draw human thermal silhouette: Head (bright ~230), Torso (~220), Legs (~195)
        head_radius = 5
        draw.ellipse([ped_base_x + 4, ped_base_y, ped_base_x + 4 + head_radius*2, ped_base_y + head_radius*2], fill=235)
        draw.rounded_rectangle([ped_base_x + 2, ped_base_y + 11, ped_base_x + ped_w - 2, ped_base_y + 28], radius=3, fill=220)
        # Walking legs
        leg_phase = math.sin(t * 3.5)
        draw.line([ped_base_x + 5, ped_base_y + 28, ped_base_x + 3 + int(leg_phase * 4), ped_base_y + ped_h], fill=200, width=3)
        draw.line([ped_base_x + 13, ped_base_y + 28, ped_base_x + 15 - int(leg_phase * 4), ped_base_y + ped_h], fill=200, width=3)

        detections.append({
            "label": "Pedestrian",
            "confidence": 0.97 - 0.02 * math.cos(t),
            "bbox": [ped_base_x - 4, ped_base_y - 2, ped_w + 8, ped_h + 6],
            "temperature_c": round(36.8 + 0.3 * math.sin(t), 1)
        })

        # Object C: Roadside Marker / Guardrail Post
        draw.rectangle([center_x - 140, horizon_y + 80, center_x - 132, horizon_y + 110], fill=110)

        # 4. Thermal diffusion blur (simulating IR lens characteristics and atmospheric diffusion)
        blurred_gray = norm_img.filter(ImageFilter.GaussianBlur(radius=1.8))
        arr_gray = np.array(blurred_gray, dtype=np.uint8)

        # Add subtle sensor thermal noise (FPA uncooled microbolometer sensor noise)
        noise = (np.random.randn(self.height, self.width) * 4.0).astype(np.int16)
        arr_noisy = np.clip(arr_gray.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # 5. Apply 256-color Ironbow Thermography Palette
        rgb_img = self.palette[arr_noisy]  # Shape: (height, width, 3)
        final_pil = Image.fromarray(rgb_img, mode='RGB')

        # Convert to Base64 JPEG data URL
        buffer = io.BytesIO()
        final_pil.save(buffer, format="JPEG", quality=82)
        base64_str = f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
        
        ambient_temp = 18.4 + 0.5 * math.sin(t * 0.1)
        max_temp = 86.5 + 2.0 * math.cos(t * 0.4)

        return base64_str, detections, round(ambient_temp, 1), round(max_temp, 1)

thermal_renderer = ThermalRenderer()
