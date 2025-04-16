import { useState } from 'react';
import { ThemeProvider, createTheme, Tabs, Tab, Box, TextField, Button, Typography } from '@mui/material';
import axios from 'axios';

const theme = createTheme(); // Create a theme for the application

import './App.css';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [salesforceData, setSalesforceData] = useState({
    opportunityId: '',
    accountName: '',
    amount: '',
    closeDate: ''
  });
  
  const [frontendData, setFrontendData] = useState({
    featureName: '',
    developer: '',
    estHours: '',
    dueDate: ''
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSalesforceSubmit = (e) => {
    e.preventDefault();
    console.log('Salesforce Data Submitted:', salesforceData);
    // Implement API call to submit Salesforce data
    axios.post('/api/salesforce', salesforceData)
      .then(response => {
        console.log('Salesforce data submitted successfully:', response.data);
      })
      .catch(error => {
        console.error('Error submitting Salesforce data:', error);
      });
  };

  const handleFrontendSubmit = (e) => {
    e.preventDefault();
    console.log('Frontend Data Submitted:', frontendData);
    // Implement API call to submit Frontend data
    axios.post('/api/frontend', frontendData)
      .then(response => {
        console.log('Frontend data submitted successfully:', response.data);
      })
      .catch(error => {
        console.error('Error submitting Frontend data:', error);
      });
  };

  return (
    <div className="App">
      <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Salesforce Data Entry" />
          <Tab label="Frontend Data Entry" />
          <Tab label="Search by SFID" />
        </Tabs>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        <Box component="form" onSubmit={handleSalesforceSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500, margin: '0 auto' }}>
          <TextField
            label="Opportunity ID"
            value={salesforceData.opportunityId}
            onChange={(e) => setSalesforceData({...salesforceData, opportunityId: e.target.value})}
            required
          />
          <TextField
            label="Account Name"
            value={salesforceData.accountName}
            onChange={(e) => setSalesforceData({...salesforceData, accountName: e.target.value})}
            required
          />
          <TextField
            label="Amount"
            type="number"
            value={salesforceData.amount}
            onChange={(e) => setSalesforceData({...salesforceData, amount: e.target.value})}
            required
          />
          <TextField
            label="Close Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={salesforceData.closeDate}
            onChange={(e) => setSalesforceData({...salesforceData, closeDate: e.target.value})}
            required
          />
          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            Submit Salesforce Data
          </Button>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box component="form" onSubmit={handleFrontendSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500, margin: '0 auto' }}>
          <TextField
            label="Feature Name"
            value={frontendData.featureName}
            onChange={(e) => setFrontendData({...frontendData, featureName: e.target.value})}
            required
          />
          <TextField
            label="Developer"
            value={frontendData.developer}
            onChange={(e) => setFrontendData({...frontendData, developer: e.target.value})}
            required
          />
          <TextField
            label="Estimated Hours"
            type="number"
            value={frontendData.estHours}
            onChange={(e) => setFrontendData({...frontendData, estHours: e.target.value})}
            required
          />
          <TextField
            label="Due Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={frontendData.dueDate}
            onChange={(e) => setFrontendData({...frontendData, dueDate: e.target.value})}
            required
          />
          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            Submit Frontend Data
          </Button>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500, margin: '0 auto' }}>
          <TextField
            label="Enter SFID"
            value={salesforceData.opportunityId}
            onChange={(e) => setSalesforceData({...salesforceData, opportunityId: e.target.value})}
            required
          />
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => {
            // Implement search functionality to fetch data based on SFID
            axios.get(`/api/salesforce/${salesforceData.opportunityId}`)
              .then(response => {
                console.log('Fetched data for SFID:', response.data);
              })
              .catch(error => {
                console.error('Error fetching data for SFID:', error);
              });
            console.log('Searching for SFID:', salesforceData.opportunityId);
          }}>
            Search
          </Button>
        </Box>
      </TabPanel>
      </>
    </div>
  );
}

export default App;
