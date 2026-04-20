"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
} from "@vis.gl/react-google-maps";
import { Container, FormControlLabel, Checkbox, TextField, Button, Grid, Paper, Box } from "@mui/material";

import { supabase } from '@/utils/supabase';

export default function Intro() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <div>Google Maps API Key not configured.</div>;
  }

  return (
    <Container maxWidth="lg" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <APIProvider apiKey={apiKey}>
        <MapContainer>
          <Map>
            <Directions />
          </Map>
        </MapContainer>
      </APIProvider>
    </Container>
  );
}

function Directions() {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [selectedTrashTypes, setSelectedTrashTypes] = useState<string[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [geocodeMarker, setGeocodeMarker] = useState<google.maps.Marker | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .eq('user_type', 'consumer');

        if (selectedTrashTypes.length > 0) {
          query = query.overlaps('trash_types', selectedTrashTypes);
        }

        const { data, error } = await query;

        if (error) throw error;

        const mappedLocations = data.map(loc => ({
          Location: [loc.latitude, loc.longitude],
          CompanyName: loc.company_name,
          TrashTypes: loc.trash_types,
          Email: loc.email
        }));

        setLocations(mappedLocations);
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    };

    if (selectedTrashTypes.length > 0) {
      fetchLocation();
    } else {
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
    }
  }, [selectedTrashTypes, map]);

  useEffect(() => {
    setIsButtonDisabled(!(selectedTrashTypes.length > 0 && address.trim() !== ""));
  }, [selectedTrashTypes, address]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedTrashTypes((prev) => {
      const updatedTrashTypes = checked
        ? [...prev, value]
        : prev.filter((type) => type !== value);

      return updatedTrashTypes;
    });
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
  };

  const handleGeocodeAddress = async () => {
    if (!map || isButtonDisabled || address.trim() === "") return;
    
    try {
      const geocoder = new google.maps.Geocoder();
      
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
  
      if (geocodeMarker) {
        geocodeMarker.setMap(null);
        setGeocodeMarker(null);
      }
  
      if (directionsRenderer) {
        directionsRenderer.setDirections(null);
      }
  
      geocoder.geocode({ address }, async (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const userLocation = results[0].geometry.location;
          map.setCenter(userLocation);
          map.setZoom(15);
  
          const newGeocodeMarker = new google.maps.Marker({
            map,
            position: userLocation,
            title: address,
          });
          setGeocodeMarker(newGeocodeMarker);
  
          const distances = locations.map((location) => {
            const disposalLocation = new google.maps.LatLng(location.Location[0], location.Location[1]);
            return {
              location,
              distance: google.maps.geometry.spherical.computeDistanceBetween(userLocation, disposalLocation),
            };
          });
  
          const closestLocation = distances.reduce((prev, curr) => (prev.distance < curr.distance ? prev : curr));
  
          const closestMarker = new google.maps.Marker({
            map,
            position: { lat: closestLocation.location.Location[0], lng: closestLocation.location.Location[1] },
            title: closestLocation.location.CompanyName,
            icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: new google.maps.Size(50,50), }
          });
  
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h3>\${closestLocation.location.CompanyName}</h3>
                <p>\${closestLocation.location.TrashTypes.join(", ")}</p>
                <p>\${closestLocation.location.Email}</p>
              </div>
            `,
          });
  
          closestMarker.addListener("click", () => {
            infoWindow.open(map, closestMarker);
          });
  
          if (directionsService) {
            directionsService.route(
              {
                origin: userLocation,
                destination: closestMarker.getPosition() as unknown as google.maps.LatLngLiteral,
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
                  const route = result.routes[0];
                  if (route && route.legs && route.legs.length > 0) {
                    const leg = route.legs[0];
                    const distance = leg.distance?.text || "Unknown distance";
                    const duration = leg.duration?.text || "Unknown duration";
                    
                    setRouteDistance(distance);
                    setRouteDuration(duration);
    
                    if (directionsRenderer) {
                      directionsRenderer.setDirections(result);
                    }
                  }
                }
              }
            );
          }
        }
      });
    } catch (error) {
      console.error("Error geocoding address:", error);
    }
  };
  
  useEffect(() => {
    if (locations.length > 0 && map) {
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      const iconUrl = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
      const newMarkers: google.maps.Marker[] = locations.map((location) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: location.Location[0], lng: location.Location[1] },
          title: location.CompanyName,
          icon: iconUrl
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <h3>\${location.CompanyName}</h3>
              <p>\${location.TrashTypes.join(", ")}</p>
              <p>\${location.Email}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        return marker;
      });

      setMarkers(newMarkers);
    }
  }, [locations, map]);

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, p: 2, backgroundColor: 'white', boxShadow: 1 ,mb: 4}}>
      <Paper elevation={3} sx={{ padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <FormControlLabel
                control={<Checkbox value="TPU" onChange={handleCheckboxChange} />}
                label="TPU"
              />
              <FormControlLabel
                control={<Checkbox value="PLA" onChange={handleCheckboxChange} />}
                label="PLA"
              />
              <FormControlLabel
                control={<Checkbox value="PETG" onChange={handleCheckboxChange} />}
                label="PETG"
              />
            </div>
          </Grid>
          <Grid item xs={12}>
            <TextField
              variant="outlined"
              label="Enter Your Address"
              value={address}
              onChange={handleAddressChange}
              placeholder="Enter address"
              sx={{ width: 300 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGeocodeAddress}
              disabled={isButtonDisabled}
              fullWidth
            >
              Find Nearest Disposal Site
            </Button>
          </Grid>
          {routeDistance && routeDuration && (
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                Distance to Closest Disposal Site: {routeDistance}<br />
                Estimated Travel Time: {routeDuration}
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}

const MapContainer = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ position: 'relative', flex: 1, mt: 8 }}>
      {children}
    </Box>
  );
