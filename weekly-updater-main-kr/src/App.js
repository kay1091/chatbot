import React, { useState, useMemo } from 'react';
import { TextField, Button, Typography } from '@mui/material'; // Import TextField, Button, and Typography from Material-UI
import * as XLSX from 'xlsx'; // Import the xlsx library

// Define column names based on the provided Python script (used for reference)
const salesforceColsRef = [
    'Opportunity ID', 'Practice', 'Description', 'Opportunity Name', 'Type',
    'Lead Source', 'SBU', 'Billing Country', 'Amount Currency', 'Amount',
    'Expected Revenue Currency', 'Expected Revenue', 'Competitor Details Old',
    'Close Date', 'Next Step', 'Stage', 'Probability (%)', 'Fiscal Period',
    'Age', 'Created Date', 'Opportunity Owner', 'Owner Role', 'Account Name',
    'Project Type', 'Technology/Skills', 'IT Lifecycle', 'Service Offering',
    'Service Category', 'Loss Stage', 'Loss Notes', 'Lost Reason', 'Group SBU',
    'Vertical Practice', 'Segment', 'Created By', 'Deal Type', 'Industry Solutions',
    'Amount (converted) Currency', 'Amount (converted)', 'Virtusa/Polaris',
    'Quality of Revenue', 'Proposal Type', 'BOLT Details', 'BOLT Status'
];

const frontendColsRef = [
    'Type', 'SBU', 'Account Name', 'SFID', 'Opportunity Name', '$ Value (M)',
    'Opportunity Description', 'Client Partner', 'Partner Details',
    'Status/ Next Steps', 'Due Date', 'Activity Type', 'Bid Manager',
    'Proposal Writer', 'Orals SPOC', 'Solution SPOCs', 'Delivery Lead',
    'Deal Status', 'Close Date', 'PSA Comp. in Week', 'PSA Comp. Dt. Mapping',
    'Opp. Status', 'Sb. FY', 'Sb. Qtr.', 'Cl. FY', 'Cl. QTR', 'TCV Brk. Up',
    'Direct/ Related', 'OB Related Status', 'TCV Related Status'
];

// Define the keys used for SFID in each file type
const SALESFORCE_SFID_KEY = 'Opportunity ID';
const FRONTEND_SFID_KEY = 'SFID'; // Assuming this is the key in the frontend file

// Combine and find all unique column headers across both reference lists
const allPossibleColumns = [...new Set([...salesforceColsRef, ...frontendColsRef])];

// Function to attempt parsing a date (handles Excel serial dates and strings)
const parseDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    let date = null;
    if (typeof value === 'number') {
        // Try parsing as Excel serial date
        try {
            date = XLSX.SSF.parse_date_code(value);
            // XLSX.SSF.parse_date_code returns an object { y, m, d, H, M, S }
            // Need to construct a Date object (month is 0-indexed)
            if (date) {
                return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0);
            }
        } catch (e) { /* Ignore error, try string parsing */ }
    }
    // Try parsing as string
    try {
        date = new Date(value);
        if (!isNaN(date.getTime())) { // Check if valid date
            return date;
        }
    } catch (e) { /* Ignore error */ }
    return null; // Return null if parsing failed
};

function App() {
    // State to hold the parsed data from each uploaded file
    const [salesforceData, setSalesforceData] = useState([]);
    const [frontendData, setFrontendData] = useState(() => {
        const savedData = localStorage.getItem('frontendData');
        return savedData ? JSON.parse(savedData) : [];
    });
    // State to track the active tab ('salesforce', 'frontend', 'consolidated', 'manual', 'sfidSearch')
    const [activeTab, setActiveTab] = useState('salesforce');
    // State for loading indicators
    const [loadingSalesforce, setLoadingSalesforce] = useState(false);
    const [loadingFrontend, setLoadingFrontend] = useState(false);
    const [manualEntryData, setManualEntryData] = useState({}); // State for manual entry fields
    const [sfidSearch, setSfidSearch] = useState(''); // State for SFID search input
    const [searchResult, setSearchResult] = useState(null); // State for search result

    // Function to handle file reading and parsing
    const handleFile = (file, fileType) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true }); // Use cellDates: true
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                // Process rows: Assign SFID and effective_last_updated
                const processedData = json.map(row => {
                    const sfidKey = fileType === 'salesforce' ? SALESFORCE_SFID_KEY : FRONTEND_SFID_KEY;
                    const sfid = row[sfidKey];

                    // Determine effective_last_updated: Prioritize 'Close Date', then 'Created Date', then 'Due Date'
                    let effectiveDate = parseDate(row['Close Date']) || parseDate(row['Created Date']) || parseDate(row['Due Date']) || null;

                    return {
                        ...row,
                        // Ensure a consistent SFID key for consolidation
                        [SALESFORCE_SFID_KEY]: sfid, // Use the Salesforce key as the standard
                        effective_last_updated: effectiveDate ? effectiveDate.toISOString() : null // Store as ISO string or null
                    };
                });

                if (fileType === 'salesforce') {
                    setSalesforceData(processedData);
                    setLoadingSalesforce(false);
                    alert(`Salesforce file "${file.name}" processed successfully.`);
                } else {
                    setFrontendData(processedData);
                    setLoadingFrontend(false);
                    alert(`Frontend file "${file.name}" processed successfully.`);
                }
            } catch (error) {
                console.error("Error processing file:", error);
                alert(`Error processing file "${file.name}". Please ensure it's a valid Excel file.`);
                if (fileType === 'salesforce') setLoadingSalesforce(false);
                else setLoadingFrontend(false);
            }
        };
        reader.onerror = (error) => {
            console.error("File reading error:", error);
            alert(`Error reading file "${file.name}".`);
            if (fileType === 'salesforce') setLoadingSalesforce(false);
            else setLoadingFrontend(false);
        };

        if (fileType === 'salesforce') setLoadingSalesforce(true);
        else setLoadingFrontend(true);
        reader.readAsBinaryString(file); // Read as binary string for xlsx library
    };

    // Combine data from both sources for the consolidated view
    const consolidatedData = useMemo(() => {
        const combined = [...salesforceData, ...frontendData];
        // Sort by the effective_last_updated date, descending (newest first)
        // Handle null dates by placing them at the end
        combined.sort((a, b) => {
            const dateA = a.effective_last_updated ? new Date(a.effective_last_updated) : null;
            const dateB = b.effective_last_updated ? new Date(b.effective_last_updated) : null;
            if (dateB === null && dateA === null) return 0; // Both null, equal
            if (dateB === null) return -1; // B is null, A comes first
            if (dateA === null) return 1;  // A is null, B comes first
            return dateB - dateA; // Both valid, sort descending
        });
        return combined;
    }, [salesforceData, frontendData]);

    // Function to clear all data
    const clearAllData = () => {
        if (window.confirm("Are you sure you want to clear ALL uploaded data?")) {
            setSalesforceData([]);
            setFrontendData([]); // Clear frontend data
            localStorage.removeItem('frontendData'); // Clear local storage for frontend data
            // Reset file inputs visually (optional, browser-dependent)
            const sfInput = document.getElementById('salesforce-file-input');
            const feInput = document.getElementById('frontend-file-input');
            if (sfInput) sfInput.value = '';
            if (feInput) feInput.value = '';
            alert("All data cleared.");
        }
    };

    // Determine unique columns present in the actual loaded data for the table header
    const actualColumns = useMemo(() => {
        const headers = new Set([SALESFORCE_SFID_KEY]); // Always include SFID key
        consolidatedData.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'effective_last_updated') { // Exclude internal sorting key
                    headers.add(key);
                }
            });
        });
        // Ensure SFID is first, then sort others alphabetically for consistency
        const sortedHeaders = Array.from(headers);
        const sfidIndex = sortedHeaders.indexOf(SALESFORCE_SFID_KEY);
        if (sfidIndex > -1) {
            sortedHeaders.splice(sfidIndex, 1); // Remove SFID
        }
        sortedHeaders.sort(); // Sort remaining headers
        sortedHeaders.unshift(SALESFORCE_SFID_KEY); // Add SFID back to the beginning
        // Also add the effective_last_updated column at the end for export
        sortedHeaders.push('effective_last_updated');
        return sortedHeaders;
    }, [consolidatedData]);

    // Function to handle downloading the consolidated data
    const handleDownload = () => {
        if (consolidatedData.length === 0) {
            alert("No data to download.");
            return;
        }

        // Prepare data for worksheet: Ensure consistent column order based on actualColumns
        const dataForSheet = consolidatedData.map(row => {
            const orderedRow = {};
            actualColumns.forEach(col => {
                // Format dates nicely for Excel if they are Date objects or valid ISO strings
                if (col === 'effective_last_updated' && row[col]) {
                    try {
                        orderedRow[col] = new Date(row[col]).toLocaleString();
                    } catch {
                        orderedRow[col] = row[col]; // Fallback to original value
                    }
                } else {
                    orderedRow[col] = row[col] !== undefined ? row[col] : ''; // Use empty string for missing values
                }
            });
            return orderedRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: actualColumns });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidated Data");

        // Generate filename with timestamp
        const fileName = `consolidated_data_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const fillDummyData = () => {
        setManualEntryData({
            'Opportunity ID': '12345',
            'Practice': 'Consulting',
            'Description': 'Dummy description',
            'Opportunity Name': 'Dummy Opportunity',
            'Type': 'New Business',
            'Lead Source': 'Web',
            'SBU': 'North America',
            'Billing Country': 'USA',
            'Amount Currency': 'USD',
            'Amount': '10000',
            'Expected Revenue Currency': 'USD',
            'Expected Revenue': '12000',
            'Competitor Details Old': 'None',
            'Close Date': '2025-12-31',
            'Next Step': 'Follow up',
            'Stage': 'Negotiation',
            'Probability (%)': '75',
            'Fiscal Period': '2025-Q4',
            'Age': '30',
            'Created Date': '2025-01-01',
            'Opportunity Owner': 'John Doe',
            'Owner Role': 'Sales',
            'Account Name': 'Dummy Account',
            'Project Type': 'Implementation',
            'Technology/Skills': 'React, Node.js',
            'IT Lifecycle': 'Development',
            'Service Offering': 'Consulting Services',
            'Service Category': 'IT Services',
            'Loss Stage': 'N/A',
            'Loss Notes': 'N/A',
            'Lost Reason': 'N/A',
            'Group SBU': 'North America',
            'Vertical Practice': 'Finance',
            'Segment': 'Enterprise',
            'Created By': 'Admin',
            'Deal Type': 'New',
            'Industry Solutions': 'Finance',
            'Amount (converted) Currency': 'USD',
            'Amount (converted)': '10000',
            'Virtusa/Polaris': 'N/A',
            'Quality of Revenue': 'High',
            'Proposal Type': 'Standard',
            'BOLT Details': 'N/A',
            'BOLT Status': 'Active',
            'SFID': 'SF12345',
            '$ Value (M)': '10',
            'Opportunity Description': 'Dummy description',
            'Client Partner': 'Partner A',
            'Partner Details': 'N/A',
            'Status/ Next Steps': 'Next steps',
            'Due Date': '2025-12-31',
            'Activity Type': 'Meeting',
            'Bid Manager': 'Jane Smith',
            'Proposal Writer': 'John Doe',
            'Orals SPOC': 'N/A',
            'Solution SPOCs': 'N/A',
            'Delivery Lead': 'N/A',
            'Deal Status': 'Open',
            'PSA Comp. in Week': 'N/A',
            'PSA Comp. Dt. Mapping': 'N/A',
            'Opp. Status': 'Active',
            'Sb. FY': '2025',
            'Sb. Qtr.': 'Q4',
            'Cl. FY': '2025',
            'Cl. QTR': 'Q4',
            'TCV Brk. Up': 'N/A',
            'Direct/ Related': 'Direct',
            'OB Related Status': 'N/A',
            'TCV Related Status': 'N/A'
        });
    };

    const handleManualEntrySubmit = (e) => {
        e.preventDefault();
        // Logic to update consolidated data with manual entry
        const updatedData = { ...manualEntryData, effective_last_updated: new Date().toISOString() };
        setSalesforceData([...salesforceData, updatedData]); // Add to Salesforce data for example
        localStorage.setItem('frontendData', JSON.stringify(frontendData)); // Save frontend data to local storage
        alert('Manual entry updated successfully.');
        setManualEntryData({}); // Reset manual entry fields
    };

    return (
        <div className="App p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Opportunity Data Consolidation</h1>

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="border-b border-gray-300">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salesforce' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setActiveTab('salesforce')}
                        >
                            Upload Salesforce Data
                        </button>
                        <button
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'frontend' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setActiveTab('frontend')}
                        >
                            Upload Frontend Data
                        </button>
                        <button
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'consolidated' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setActiveTab('consolidated')}
                        >
                            Consolidated View
                        </button>
                        <button
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'manual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setActiveTab('manual')}
                        >
                            Manual Entry
                        </button>
                        <button
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sfidSearch' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            onClick={() => setActiveTab('sfidSearch')}
                        >
                            SFID Search
                        </button>
                    </nav>
                </div>
            </div>

            {/* Content based on active tab */}
            <div className="bg-white p-6 rounded shadow">
                {/* Salesforce Upload Tab */}
                {activeTab === 'salesforce' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Salesforce Excel File (.xlsx)</h2>
                        <input
                            id="salesforce-file-input"
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => handleFile(e.target.files[0], 'salesforce')}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            disabled={loadingSalesforce}
                        />
                        {loadingSalesforce && <p className="mt-2 text-indigo-600">Processing Salesforce file...</p>}
                        {salesforceData.length > 0 && <p className="mt-2 text-green-600">{salesforceData.length} Salesforce records loaded.</p>}
                    </div>
                )}

                {/* Frontend Upload Tab */}
                {activeTab === 'frontend' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Frontend Excel File (.xlsx)</h2>
                        <input
                            id="frontend-file-input"
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => handleFile(e.target.files[0], 'frontend')}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            disabled={loadingFrontend}
                        />
                        {loadingFrontend && <p className="mt-2 text-blue-600">Processing Frontend file...</p>}
                        {frontendData.length > 0 && <p className="mt-2 text-green-600">{frontendData.length} Frontend records loaded.</p>}
                    </div>
                )}

                {/* Consolidated View Tab */}
                {activeTab === 'consolidated' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-700">Consolidated Data View</h2>
                            {consolidatedData.length > 0 && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleDownload}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                                    >
                                        Download Consolidated View
                                    </button>
                                    <button
                                        onClick={clearAllData}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                                    >
                                        Clear All Data
                                    </button>
                                </div>
                            )}
                        </div>
                        {consolidatedData.length === 0 ? (
                            <p className="text-center text-gray-600">No data uploaded yet. Upload files via the other tabs.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {/* Use actual columns found in the data */}
                                            {actualColumns.map(col => (
                                                <th key={col} className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col === SALESFORCE_SFID_KEY ? 'sticky left-0 bg-gray-50 z-10' : ''}`}>{col}</th>
                                            ))}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {consolidatedData.map((item, index) => (
                                            <tr key={`${item[SALESFORCE_SFID_KEY]}-${index}`} className="hover:bg-gray-50">
                                                {/* Render cells based on actual columns */}
                                                {actualColumns.map(col => (
                                                    <td key={col} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${col === SALESFORCE_SFID_KEY ? 'sticky left-0 bg-white font-medium text-gray-900 z-10' : ''}`}>{item[col] !== undefined ? String(item[col]) : ''}</td>
                                                ))}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.effective_last_updated ? new Date(item.effective_last_updated).toLocaleString() : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry Tab */}
                {activeTab === 'manual' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Manual Entry</h2>
                        <form onSubmit={handleManualEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[
                                'Opportunity ID', 'Practice', 'Description', 'Opportunity Name', 'Type',
                                'Lead Source', 'SBU', 'Billing Country', 'Amount Currency', 'Amount',
                                'Expected Revenue Currency', 'Expected Revenue', 'Competitor Details Old',
                                'Close Date', 'Next Step', 'Stage', 'Probability (%)', 'Fiscal Period',
                                'Age', 'Created Date', 'Opportunity Owner', 'Owner Role', 'Account Name',
                                'Project Type', 'Technology/Skills', 'IT Lifecycle', 'Service Offering',
                                'Service Category', 'Loss Stage', 'Loss Notes', 'Lost Reason', 'Group SBU',
                                'Vertical Practice', 'Segment', 'Created By', 'Deal Type', 'Industry Solutions',
                                'Amount (converted) Currency', 'Amount (converted)', 'Virtusa/Polaris',
                                'Quality of Revenue', 'Proposal Type', 'BOLT Details', 'BOLT Status',
                                'SFID', '$ Value (M)', 'Opportunity Description', 'Client Partner', 
                                'Partner Details', 'Status/ Next Steps', 'Due Date', 'Activity Type', 
                                'Bid Manager', 'Proposal Writer', 'Orals SPOC', 'Solution SPOCs', 
                                'Delivery Lead', 'Deal Status', 'PSA Comp. in Week', 
                                'PSA Comp. Dt. Mapping', 'Opp. Status', 'Sb. FY', 'Sb. Qtr.', 
                                'Cl. FY', 'Cl. QTR', 'TCV Brk. Up', 'Direct/ Related', 
                                'OB Related Status', 'TCV Related Status'
                            ].map((field) => (
                                <TextField
                                    key={field}
                                    label={field}
                                    value={manualEntryData[field] || ''}
                                    onChange={(e) => setManualEntryData({ ...manualEntryData, [field]: e.target.value })}
                                    required
                                />
                            ))}
                            <Button type="button" variant="outlined" color="secondary" onClick={fillDummyData}>
                                Fill Dummy Data
                            </Button>
                            <Button type="submit" variant="contained" color="primary">
                                Update Consolidated View
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
