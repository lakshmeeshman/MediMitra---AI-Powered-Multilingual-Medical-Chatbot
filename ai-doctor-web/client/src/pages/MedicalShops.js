// pages/MedicalShops.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import "../index.css";

function MedicalShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [userLocation, setUserLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchMode, setSearchMode] = useState("location"); // "location" or "shop"
  const [localShops, setLocalShops] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const navigate = useNavigate();

  // No predefined shops; we rely on OpenStreetMap/Overpass only
  const medicalShopsDatabase = [];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Real-time search functionality
  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.services.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
    const cat = (shop.type || '').toLowerCase();
    const matchesFilter = filterType === "all" ||
      (filterType === 'pharmacy' && (cat.includes('pharmacy'))) ||
      (filterType === 'chemist' && (cat.includes('chemist'))) ||
      (filterType === 'medical_supply' && (cat.includes('medical_supply'))) ||
      (filterType === 'hospital' && (cat.includes('hospital'))) ||
      (filterType === 'clinic' && (cat.includes('clinic')));
    return matchesSearch && matchesFilter;
  });

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          try {
            // Use free Nominatim geocoding service
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.display_name;
            setUserLocation(address);
            setLocationLoading(false);
            
            // Find nearby shops based on location
            findNearbyShops(latitude, longitude);
            // Also search for local shops
            searchLocalShops(latitude, longitude);
          } catch (error) {
            console.error("Error getting address:", error);
            setUserLocation(`${latitude}, ${longitude}`);
            setUserCoords({ lat: latitude, lng: longitude });
            setLocationLoading(false);
            findNearbyShops(latitude, longitude);
            searchLocalShops(latitude, longitude);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationLoading(false);
          alert("Unable to get your location. Please enter your address manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLocationLoading(false);
    }
  };

  // --- Lightweight Leaflet loader (no npm install) ---
  const ensureLeafletLoaded = () => new Promise((resolve) => {
    if (window.L && window.L.map) return resolve(window.L);
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const jsId = 'leaflet-js';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(window.L);
      document.body.appendChild(script);
    } else {
      const existing = document.getElementById(jsId);
      if (existing && existing.dataset.loaded) return resolve(window.L);
      existing.onload = () => resolve(window.L);
    }
  });

  // Initialize or update map when results or userCoords change
  useEffect(() => {
    let mapInstance = null;
    let markers = [];
    const setup = async () => {
      const L = await ensureLeafletLoaded();
      const container = document.getElementById('osm-map');
      if (!container) return;
      // Clear existing map instance if any
      if (container._leaflet_id) {
        container.remove();
        const parent = document.getElementById('osm-map-wrapper');
        if (parent) {
          const newDiv = document.createElement('div');
          newDiv.id = 'osm-map';
          newDiv.style.width = '100%';
          newDiv.style.height = '360px';
          parent.appendChild(newDiv);
        }
      }
      const center = userCoords ? [userCoords.lat, userCoords.lng] : [19.0760, 72.8777];
      mapInstance = L.map('osm-map').setView(center, userCoords ? 14 : 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      // User marker
      if (userCoords) {
        L.marker([userCoords.lat, userCoords.lng], { title: 'You are here' }).addTo(mapInstance)
          .bindPopup('You are here');
      }

      // Shop markers
      const bounds = [];
      filteredShops.forEach((shop) => {
        const lat = shop.coordinates?.lat;
        const lng = shop.coordinates?.lng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          const m = L.marker([lat, lng], { title: shop.name }).addTo(mapInstance)
            .bindPopup(`<b>${shop.name}</b><br/>${shop.address || ''}`);
          markers.push(m);
          bounds.push([lat, lng]);
        }
      });
      if (bounds.length > 0) {
        mapInstance.fitBounds(bounds, { padding: [24, 24] });
      }
    };
    // Defer until DOM has the container
    setTimeout(setup, 0);
    return () => {
      // Let Leaflet GC on rerender; lightweight approach without keeping refs
    };
  }, [filteredShops, userCoords]);

  const searchLocalShops = async (lat, lng) => {
    try {
      // Multi-tier comprehensive search: 0m to 30km in granular levels
      const allResults = [];
      const seen = new Set();
      
      // Tier 0: Ultra-tight Overpass search (0-500m) - Immediate vicinity
      try {
        const r0 = await fetch(`http://localhost:5051/osm/nearby?lat=${lat}&lon=${lng}&radius=${500}`);
        const d0 = await r0.json();
        const elements0 = Array.isArray(d0?.elements) ? d0.elements : [];
        elements0.forEach((element, index) => {
          const eLat = typeof element.lat === 'number' ? element.lat : (element.center?.lat);
          const eLon = typeof element.lon === 'number' ? element.lon : (element.center?.lon);
          if (!isFinite(eLat) || !isFinite(eLon)) return;
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.shop || tags.amenity || tags.healthcare || "Medical Place";
          const clsType = tags.amenity === 'pharmacy' ? 'pharmacy'
            : tags.shop === 'chemist' ? 'chemist'
            : tags.shop === 'medical_supply' ? 'medical_supply'
            : tags.healthcare === 'hospital' ? 'hospital'
            : tags.healthcare === 'clinic' ? 'clinic'
            : 'medical';
          const distance = calculateDistance(lat, lng, eLat, eLon);
          const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
          if (!seen.has(key)) {
            seen.add(key);
            allResults.push({
              id: `t0-${element.type}-${element.id}-${index}`,
              name,
              type: clsType,
              address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || 'Nearby',
              distance: `${distance.toFixed(1)} km`,
              open: true,
              services: [
                tags.amenity === 'pharmacy' ? 'Pharmacy' : undefined,
                tags.shop === 'chemist' ? 'Chemist' : undefined,
                tags.shop === 'medical_supply' ? 'Medical Supply' : undefined,
                tags.healthcare ? tags.healthcare : undefined
              ].filter(Boolean),
              coordinates: { lat: eLat, lng: eLon },
              isLocal: true
            });
          }
        });
      } catch(_) {}

      // Tier 1: Tight Overpass search (500m-1km) - Very close
      try {
        const r1 = await fetch(`http://localhost:5051/osm/nearby?lat=${lat}&lon=${lng}&radius=${1000}`);
        const d1 = await r1.json();
        const elements1 = Array.isArray(d1?.elements) ? d1.elements : [];
        elements1.forEach((element, index) => {
          const eLat = typeof element.lat === 'number' ? element.lat : (element.center?.lat);
          const eLon = typeof element.lon === 'number' ? element.lon : (element.center?.lon);
          if (!isFinite(eLat) || !isFinite(eLon)) return;
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.shop || tags.amenity || tags.healthcare || "Medical Place";
          const clsType = tags.amenity === 'pharmacy' ? 'pharmacy'
            : tags.shop === 'chemist' ? 'chemist'
            : tags.shop === 'medical_supply' ? 'medical_supply'
            : tags.healthcare === 'hospital' ? 'hospital'
            : tags.healthcare === 'clinic' ? 'clinic'
            : 'medical';
          const distance = calculateDistance(lat, lng, eLat, eLon);
          const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
          if (!seen.has(key)) {
            seen.add(key);
            allResults.push({
              id: `t1-${element.type}-${element.id}-${index}`,
              name,
              type: clsType,
              address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || 'Nearby',
              distance: `${distance.toFixed(1)} km`,
              open: true,
              services: [
                tags.amenity === 'pharmacy' ? 'Pharmacy' : undefined,
                tags.shop === 'chemist' ? 'Chemist' : undefined,
                tags.shop === 'medical_supply' ? 'Medical Supply' : undefined,
                tags.healthcare ? tags.healthcare : undefined
              ].filter(Boolean),
              coordinates: { lat: eLat, lng: eLon },
              isLocal: true
            });
          }
        });
      } catch(_) {}

      // Tier 1.5: Extended tight search (1km-2km) - Close range
      try {
        const r15 = await fetch(`http://localhost:5051/osm/nearby?lat=${lat}&lon=${lng}&radius=${2000}`);
        const d15 = await r15.json();
        const elements15 = Array.isArray(d15?.elements) ? d15.elements : [];
        elements15.forEach((element, index) => {
          const eLat = typeof element.lat === 'number' ? element.lat : (element.center?.lat);
          const eLon = typeof element.lon === 'number' ? element.lon : (element.center?.lon);
          if (!isFinite(eLat) || !isFinite(eLon)) return;
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.shop || tags.amenity || tags.healthcare || "Medical Place";
          const clsType = tags.amenity === 'pharmacy' ? 'pharmacy'
            : tags.shop === 'chemist' ? 'chemist'
            : tags.shop === 'medical_supply' ? 'medical_supply'
            : tags.healthcare === 'hospital' ? 'hospital'
            : tags.healthcare === 'clinic' ? 'clinic'
            : 'medical';
          const distance = calculateDistance(lat, lng, eLat, eLon);
          const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
          if (!seen.has(key)) {
            seen.add(key);
            allResults.push({
              id: `t15-${element.type}-${element.id}-${index}`,
              name,
              type: clsType,
              address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || 'Nearby',
              distance: `${distance.toFixed(1)} km`,
              open: true,
              services: [
                tags.amenity === 'pharmacy' ? 'Pharmacy' : undefined,
                tags.shop === 'chemist' ? 'Chemist' : undefined,
                tags.shop === 'medical_supply' ? 'Medical Supply' : undefined,
                tags.healthcare ? tags.healthcare : undefined
              ].filter(Boolean),
              coordinates: { lat: eLat, lng: eLon },
              isLocal: true
            });
          }
        });
      } catch(_) {}

      // Tier 2: Extended Overpass search (1-5km)
      try {
        const r2 = await fetch(`http://localhost:5051/osm/nearby?lat=${lat}&lon=${lng}&radius=${5000}`);
        const d2 = await r2.json();
        const elements2 = Array.isArray(d2?.elements) ? d2.elements : [];
        elements2.forEach((element, index) => {
          const eLat = typeof element.lat === 'number' ? element.lat : (element.center?.lat);
          const eLon = typeof element.lon === 'number' ? element.lon : (element.center?.lon);
          if (!isFinite(eLat) || !isFinite(eLon)) return;
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.shop || tags.amenity || tags.healthcare || "Medical Place";
          const clsType = tags.amenity === 'pharmacy' ? 'pharmacy'
            : tags.shop === 'chemist' ? 'chemist'
            : tags.shop === 'medical_supply' ? 'medical_supply'
            : tags.healthcare === 'hospital' ? 'hospital'
            : tags.healthcare === 'clinic' ? 'clinic'
            : 'medical';
          const distance = calculateDistance(lat, lng, eLat, eLon);
          const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
          if (!seen.has(key)) {
            seen.add(key);
            allResults.push({
              id: `t2-${element.type}-${element.id}-${index}`,
              name,
              type: clsType,
              address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || 'Nearby',
              distance: `${distance.toFixed(1)} km`,
              open: true,
              services: [
                tags.amenity === 'pharmacy' ? 'Pharmacy' : undefined,
                tags.shop === 'chemist' ? 'Chemist' : undefined,
                tags.shop === 'medical_supply' ? 'Medical Supply' : undefined,
                tags.healthcare ? tags.healthcare : undefined
              ].filter(Boolean),
              coordinates: { lat: eLat, lng: eLon },
              isLocal: true
            });
          }
        });
      } catch(_) {}

      // Tier 3: Nominatim keyword search (5-15km) - Broader coverage
      const keywords = ['medical', 'medical store', 'medical shop', 'pharmacy', 'chemist', 'drug', 'druggist', 'medical supply', 'clinic', 'hospital', 'medplus', 'apollo', 'guardian'];
      const radiusKm = 15;
      const dLat = radiusKm / 111;
      const dLon = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
      const viewbox = [lng - dLon, lat + dLat, lng + dLon, lat - dLat].join(',');
      
      const requests = keywords.map(k => 
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(k)}&viewbox=${viewbox}&bounded=1&limit=30`)
          .then(r => r.json()).catch(() => [])
      );
      const responses = await Promise.all(requests);
      responses.flat().forEach((e, idx) => {
        const eLat = parseFloat(e.lat);
        const eLon = parseFloat(e.lon);
        if (!isFinite(eLat) || !isFinite(eLon)) return;
        const name = (e.display_name || '').split(',')[0] || 'Medical Place';
        const cls = (e.class || '').toLowerCase();
        const typ = (e.type || '').toLowerCase();
        let categoryGuess = 'medical';
        if (cls === 'amenity' && typ === 'pharmacy') categoryGuess = 'pharmacy';
        else if (cls === 'shop' && (typ === 'chemist' || /chemist/.test(typ))) categoryGuess = 'chemist';
        else if (cls === 'shop' && /medical/.test(typ)) categoryGuess = 'medical_supply';
        else if (cls === 'healthcare' && typ === 'hospital') categoryGuess = 'hospital';
        else if (cls === 'healthcare' && typ === 'clinic') categoryGuess = 'clinic';
        else if (/hospital/i.test(name)) categoryGuess = 'hospital';
        else if (/clinic/i.test(name)) categoryGuess = 'clinic';
        else if (/chemist/i.test(name)) categoryGuess = 'chemist';
        else if (/pharma|pharmacy/i.test(name)) categoryGuess = 'pharmacy';
        const distance = calculateDistance(lat, lng, eLat, eLon);
        const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
        if (!seen.has(key)) {
          seen.add(key);
          allResults.push({
            id: `t3-nom-${idx}-${e.place_id}`,
            name,
            type: categoryGuess,
            address: e.display_name || 'Nearby',
            distance: `${distance.toFixed(1)} km`,
            open: true,
            services: [categoryGuess.charAt(0).toUpperCase() + categoryGuess.slice(1)],
            coordinates: { lat: eLat, lng: eLon },
            isLocal: true
          });
        }
      });

      // Tier 4: Extended Overpass search (15-30km) - Maximum coverage
      try {
        const r4 = await fetch(`http://localhost:5051/osm/nearby?lat=${lat}&lon=${lng}&radius=${30000}`);
        const d4 = await r4.json();
        const elements4 = Array.isArray(d4?.elements) ? d4.elements : [];
        elements4.forEach((element, index) => {
          const eLat = typeof element.lat === 'number' ? element.lat : (element.center?.lat);
          const eLon = typeof element.lon === 'number' ? element.lon : (element.center?.lon);
          if (!isFinite(eLat) || !isFinite(eLon)) return;
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.shop || tags.amenity || tags.healthcare || "Medical Place";
          const clsType = tags.amenity === 'pharmacy' ? 'pharmacy'
            : tags.shop === 'chemist' ? 'chemist'
            : tags.shop === 'medical_supply' ? 'medical_supply'
            : tags.healthcare === 'hospital' ? 'hospital'
            : tags.healthcare === 'clinic' ? 'clinic'
            : 'medical';
          const distance = calculateDistance(lat, lng, eLat, eLon);
          const key = `${name}|${eLat.toFixed(5)}|${eLon.toFixed(5)}`;
          if (!seen.has(key)) {
            seen.add(key);
            allResults.push({
              id: `t4-${element.type}-${element.id}-${index}`,
              name,
              type: clsType,
              address: tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || 'Nearby',
              distance: `${distance.toFixed(1)} km`,
              open: true,
              services: [
                tags.amenity === 'pharmacy' ? 'Pharmacy' : undefined,
                tags.shop === 'chemist' ? 'Chemist' : undefined,
                tags.shop === 'medical_supply' ? 'Medical Supply' : undefined,
                tags.healthcare ? tags.healthcare : undefined
              ].filter(Boolean),
              coordinates: { lat: eLat, lng: eLon },
              isLocal: true
            });
          }
        });
      } catch(_) {}

      // Sort by distance and update state
      allResults.sort((a,b)=>parseFloat(a.distance)-parseFloat(b.distance));
      setLocalShops(allResults);
      setShops(allResults);
    } catch (error) {
      console.error("Error searching local shops:", error);
      setShops([]);
    }
  };

  const findNearbyShops = (lat, lng) => {
    setLoading(true);
    try {
      // Calculate distance and find nearby shops
      const nearbyShops = medicalShopsDatabase.map(shop => {
        const distance = calculateDistance(lat, lng, shop.coordinates.lat, shop.coordinates.lng);
        return {
          ...shop,
          distance: `${distance.toFixed(1)} km`,
          actualDistance: distance
        };
      }).filter(shop => shop.actualDistance <= 5) // Within 5km
        .sort((a, b) => a.actualDistance - b.actualDistance);
      
      setShops(nearbyShops);
    } catch (error) {
      console.error("Error finding nearby shops:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const searchByLocation = async () => {
    if (!userLocation.trim()) {
      alert("Please enter a location or use current location");
      return;
    }
    
    setLoading(true);
    try {
      // Geocode the entered address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(userLocation)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        findNearbyShops(parseFloat(lat), parseFloat(lon));
        searchLocalShops(parseFloat(lat), parseFloat(lon));
      } else {
        alert("Location not found. Please try a different address.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error searching by location:", error);
      setLoading(false);
    }
  };

  const searchByShopName = () => {
    if (!searchTerm.trim()) {
      alert("Please enter a shop name to search");
      return;
    }
    
    setLoading(true);
    try {
      // Search for shops by name (both predefined and local)
      const allShops = [...medicalShopsDatabase, ...localShops];
      const matchingShops = allShops.filter(shop => 
        shop.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matchingShops.length > 0) {
        setShops(matchingShops);
      } else {
        alert(`No shops found with name "${searchTerm}". Try a different search term.`);
        setShops([]);
      }
    } catch (error) {
      console.error("Error searching by shop name:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="medical-shops-container">
        <div className="loading-spinner"></div>
        <p>Finding medical shops in your vicinity...</p>
      </div>
    );
  }

  return (
    <div className="medical-shops-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            ← Back to Dashboard
          </button>
          <h1>🏥 Find Medical Shops</h1>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Search Options */}
      <div className="search-section">
        <div className="search-mode-tabs">
          <button 
            className={`mode-tab ${searchMode === 'location' ? 'active' : ''}`}
            onClick={() => setSearchMode('location')}
          >
            📍 Search by Location
          </button>
          <button 
            className={`mode-tab ${searchMode === 'shop' ? 'active' : ''}`}
            onClick={() => setSearchMode('shop')}
          >
            🏥 Search by Shop Name
          </button>
        </div>

        {searchMode === 'location' ? (
          <div className="location-container">
            <div className="location-input-group">
              <input
                type="text"
                placeholder="Enter your location or address..."
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="location-input"
              />
              <button 
                onClick={getCurrentLocation} 
                className="location-btn"
                disabled={locationLoading}
              >
                {locationLoading ? "📍 Getting..." : "📍 Use Current Location"}
              </button>
            </div>
            <button 
              onClick={() => {
                if (userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number') {
                  searchLocalShops(userCoords.lat, userCoords.lng);
                } else {
                  searchByLocation();
                }
              }} 
              className="search-location-btn"
            >
              🔍 Find Local Shops Near Me
            </button>
          </div>
        ) : (
          <div className="shop-search-container">
            <div className="shop-input-group">
              <input
                type="text"
                placeholder="Search for shop name (e.g., Apollo Pharmacy, Guardian Pharmacy)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shop-search-input"
              />
              <button 
                onClick={searchByShopName} 
                className="search-shop-btn"
                disabled={!searchTerm.trim()}
              >
                🔍 Search Shops
              </button>
            </div>
          </div>
        )}
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Filter by shop name, address, or services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="pharmacy">Pharmacies</option>
            <option value="chemist">Chemists</option>
            <option value="medical_supply">Medical Supply</option>
            <option value="clinic">Clinics</option>
            <option value="hospital">Hospitals</option>
          </select>
        </div>
      </div>

      {/* Map */}
      <div id="osm-map-wrapper" style={{marginTop: '8px'}}>
        <div id="osm-map" style={{width:'100%',height:'360px',borderRadius:'12px',overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.08)'}} />
      </div>

      {/* Results */}
      <div className="results-section">
        <div className="results-header">
          <h3>Found {filteredShops.length} medical shops</h3>
          {localShops.length > 0 && (
            <p className="local-shops-info">
              🎯 {localShops.length} local shops found in your vicinity
            </p>
          )}
        </div>

        <div className="shops-grid">
          {filteredShops.map(shop => (
            <div key={shop.id} className={`shop-card ${shop.isLocal ? 'local-shop' : ''}`}>
              <div className="shop-header">
                <div className="shop-icon">
                  {shop.type === "pharmacy" ? "💊" : 
                   shop.type === "medical_store" ? "🏥" : "🏨"}
                </div>
                <div className="shop-status">
                  <span className={`status-badge ${shop.open ? 'open' : 'closed'}`}>
                    {shop.open ? "🟢 Open" : "🔴 Closed"}
                  </span>
                  {shop.isLocal && <span className="local-badge">📍 Local</span>}
                </div>
              </div>

              <div className="shop-info">
                <h3>{shop.name}</h3>
                <p className="shop-address">📍 {shop.address}</p>
                {shop.distance && <p className="shop-distance">📏 {shop.distance} away</p>}
                {/* Rating removed */}
              </div>

              <div className="shop-services">
                <h4>Services:</h4>
                <div className="services-list">
                  {shop.services.map((service, index) => (
                    <span key={index} className="service-tag">{service}</span>
                  ))}
                </div>
              </div>

              <div className="shop-actions">
                <button className="directions-btn" onClick={() => {
                  if (shop.coordinates) {
                    window.open(`https://maps.google.com/?q=${shop.coordinates.lat},${shop.coordinates.lng}`);
                  } else {
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`);
                  }
                }}>
                  🗺️ Get Directions
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredShops.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No medical shops found</h3>
            <p>Try adjusting your search terms or location</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.open("https://maps.google.com/?q=pharmacy")}>
            🗺️ Find Nearest Pharmacy
          </button>
          <button className="action-btn" onClick={() => window.open("https://maps.google.com/?q=medical+store")}>
            🏥 Find Medical Stores
          </button>
          <button className="action-btn" onClick={() => navigate("/text-chat")}>
            💬 Ask AI Doctor
          </button>
        </div>
      </div>
    </div>
  );
}

export default MedicalShops;
