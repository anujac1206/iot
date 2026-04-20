import { useState, useEffect } from 'react';

// ESP32 Configuration - REPLACE WITH YOUR ESP32 IP ADDRESS
const ESP32_IP = '10.184.79.5'; // Update this to your ESP32's IP address

export function usePatientData(selectedPatient, demoMode) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate demo data
  const generateDemoData = () => ({
    temp: Math.round((Math.random() * 10 + 20) * 10) / 10, // 20-30°C
    hum: Math.round(Math.random() * 30 + 40), // 40-70%
    flame: Math.random() > 0.9, // 10% chance
    motion: Math.random() > 0.7, // 30% chance
    ldrValue: Math.floor(Math.random() * 4000),
    lightState: Math.random() > 0.5, // 50% chance
    buzzerEnabled: false,
    systemArmed: true,
    room: selectedPatient ? `Room ${selectedPatient.slice(-1)}${selectedPatient.slice(-1)}` : 'ROOM 101',
    patientId: selectedPatient || 'John D.',
    timestamp: new Date().toLocaleTimeString(),
    battery: `${Math.round(Math.random() * 30 + 70)}%` // 70-100%
  });

  // Fetch data directly from ESP32
  const fetchESP32Data = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://${ESP32_IP}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`ESP32 responded with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Map ESP32 response to dashboard format
      const mappedData = {
        temp: parseFloat(result.temperature) || 0,
        hum: parseFloat(result.humidity) || 0,
        flame: result.flameDetected === 1 || result.flameDetected === true,
        motion: result.motionDetected === 1 || result.motionDetected === true,
        ldrValue: parseInt(result.ldrValue) || 0,
        lightState: result.lightState === true || result.lightState === "true",
        buzzerEnabled: result.buzzerEnabled === true || result.buzzerEnabled === "true",
        systemArmed: result.systemArmed === true || result.systemArmed === "true",
        timestamp: result.timestamp || new Date().toLocaleString(),
        patientId: result.patientId || selectedPatient || 'John D.',
        room: result.room || (selectedPatient ? `Room ${selectedPatient.slice(-1)}${selectedPatient.slice(-1)}` : 'ROOM 101'),
        battery: '95%', // ESP32 doesn't provide battery info
        wifiStatus: result.wifiStatus
      };
      
      setData(mappedData);
      setLoading(false);
      
    } catch (err) {
      console.error('ESP32 fetch error:', err);
      setError(`Failed to connect to ESP32 at ${ESP32_IP}. ${err.message}`);
      setLoading(false);
    }
  };

  // Toggle buzzer - calls ESP32 API
  const toggleBuzzer = async () => {
    if (demoMode) {
      // Demo mode - just update local state
      setData(prev => ({
        ...prev,
        buzzerEnabled: !prev?.buzzerEnabled
      }));
    } else {
      // Real mode - call ESP32 API
      try {
        const response = await fetch(`http://${ESP32_IP}/toggle-buzzer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Buzzer toggled:', result);
          
          // Update local state immediately for responsive UI
          setData(prev => ({
            ...prev,
            buzzerEnabled: result.buzzerEnabled
          }));
        } else {
          console.error('Failed to toggle buzzer');
          setError('Failed to toggle buzzer');
        }
      } catch (err) {
        console.error('Error toggling buzzer:', err);
        setError(`Error toggling buzzer: ${err.message}`);
      }
    }
  };

  // Toggle light - calls ESP32 API
  const toggleLight = async () => {
    if (demoMode) {
      // Demo mode - just update local state
      setData(prev => ({
        ...prev,
        lightState: !prev?.lightState
      }));
    } else {
      // Real mode - call ESP32 API
      try {
        const response = await fetch(`http://${ESP32_IP}/toggle-light`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Light toggled:', result);
          
          // Update local state immediately for responsive UI
          setData(prev => ({
            ...prev,
            lightState: result.lightState === "ON"
          }));
        } else {
          console.error('Failed to toggle light');
          setError('Failed to toggle light');
        }
      } catch (err) {
        console.error('Error toggling light:', err);
        setError(`Error toggling light: ${err.message}`);
      }
    }
  };

  // Arm/Disarm system - calls ESP32 API
  const toggleSystemArmed = async () => {
    if (demoMode) {
      // Demo mode - just update local state
      setData(prev => ({
        ...prev,
        systemArmed: !prev?.systemArmed
      }));
    } else {
      // Real mode - call ESP32 API
      try {
        const newState = !data?.systemArmed;
        const response = await fetch(`http://${ESP32_IP}/system-control`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: `arm=${newState}`
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('System armed state changed:', result);
          
          // Update local state immediately for responsive UI
          setData(prev => ({
            ...prev,
            systemArmed: newState
          }));
        } else {
          console.error('Failed to change system armed state');
          setError('Failed to change system armed state');
        }
      } catch (err) {
        console.error('Error changing system armed state:', err);
        setError(`Error changing system armed state: ${err.message}`);
      }
    }
  };

  // Demo mode interval
  useEffect(() => {
    if (!demoMode || !selectedPatient) return;

    setLoading(true);
    
    // Initial data
    setData(generateDemoData());
    setLoading(false);

    // Update demo data every 3 seconds
    const interval = setInterval(() => {
      setData(prev => ({
        ...generateDemoData(),
        // Preserve toggle states in demo mode
        buzzerEnabled: prev?.buzzerEnabled || false,
        lightState: prev?.lightState !== undefined ? prev.lightState : Math.random() > 0.5,
        systemArmed: prev?.systemArmed !== undefined ? prev.systemArmed : true
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [demoMode, selectedPatient]);

  // Real mode - fetch from ESP32
  useEffect(() => {
    if (!demoMode && selectedPatient) {
      setLoading(true);
      
      // Initial fetch
      fetchESP32Data();
      
      // Poll ESP32 every 2 seconds for real-time updates
      const interval = setInterval(fetchESP32Data, 2000);
      
      return () => clearInterval(interval);
    } else if (!demoMode) {
      setData(null);
      setError(null);
    }
  }, [selectedPatient, demoMode]);

  return {
    data,
    loading,
    error,
    toggleBuzzer,
    toggleLight,
    toggleSystemArmed,
  };
}