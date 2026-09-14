/**
 * SafeWay Fleet Management System — MapTiler Configuration
 * Centered on Coimbatore Mining Region (11.0168°N, 76.9558°E)
 * Key: RPFni858bOvPcXMm66cg
 */

export const MAPTILER_CONFIG = {
  apiKey: "RPFni858bOvPcXMm66cg",
  defaultCenter: [11.0168, 76.9558], // Coimbatore limestone quarry / Madukkarai
  defaultZoom: 15,
  minZoom: 12,
  maxZoom: 20,
  layers: {
    streets: {
      name: "Light Streets",
      url: "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=RPFni858bOvPcXMm66cg",
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    },
    satellite: {
      name: "Satellite Quarry",
      url: "https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=RPFni858bOvPcXMm66cg",
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>'
    },
    topo: {
      name: "Mining Topo",
      url: "https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=RPFni858bOvPcXMm66cg",
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>'
    }
  }
};
