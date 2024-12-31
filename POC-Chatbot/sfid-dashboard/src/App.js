import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns'; // Use date-fns for consistent date formatting

// Error boundary component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Caught error:', error, errorInfo);
        this.setState({ errorInfo: errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return <div style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
                <h2>Something went wrong.</h2>
                <p>Error: {this.state.error?.message}</p>
            </div>;
        }
        return this.props.children;
    }
}


// Split into components
const ChatMessage = ({ sender, message, timestamp }) => (
    <div
        style={{
            textAlign: sender === 'user' ? 'right' : 'left',
            margin: "10px 0",
            color: sender === 'user' ? 'blue' : 'green',
            wordBreak: 'break-word'
        }}
    >
        <strong>{sender === 'user' ? 'You' : 'Bot'}:</strong> {message}
        {timestamp && <small style={{ color: '#666', marginLeft: '8px' }}>{format(new Date(timestamp), 'h:mm a')}</small>}
    </div>
);

const ChatInput = ({ userInput, setUserInput, handleSubmit, loading }) => (
    <form onSubmit={handleSubmit} style={{ marginTop: "10px" }}>
        <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask something..."
            style={{ width: "80%", padding: "5px" }}
            disabled={loading}
            aria-label="Chat input"
        />
        <button
            type="submit"
            style={{ padding: "5px 10px", marginLeft: "10px" }}
            disabled={loading || !userInput.trim()}
            aria-label="Send message"
        >
            {loading ? 'Sending...' : 'Send'}
        </button>
    </form>
);


const DataTable = ({ data, loading, error, tableStyles }) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <table border="1" style={tableStyles}>
            <thead>
                <tr>
                    <th>SFID</th>
                    <th>Update</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td>{item.sfid}</td>
                        <td>{item.update}</td>
                        <td>{format(new Date(item.timestamp), 'yyyy-MM-dd h:mm a')}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// Main App component
const App = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userInput, setUserInput] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const chatHistoryRef = useRef(null); // Ref for chat history scroll

    // Memoize the fetch function to prevent unnecessary recreations
    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get('http://127.0.0.1:5000/api/sfid/all');
            console.log("Fetched data:", response.data);
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError(error.message);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Memoize the chat submission handler
    const handleChatSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const currentInput = userInput.trim();
        setUserInput(''); // Clear input field immediately for better UX

        setChatHistory((prev) => [...prev, { sender: 'user', message: currentInput }]);

        try {
            const response = await axios.post('http://127.0.0.1:5000/api/chatbot/respond', {
                query: currentInput,
            });

            setChatHistory((prev) => [...prev, {
                sender: 'bot',
                message: response.data.response,
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            console.error("Error communicating with chatbot:", error);
            setChatHistory((prev) => [...prev, {
                sender: 'bot',
                message: 'Error: Unable to get a response.',
                timestamp: new Date().toISOString()
            }]);
        }
    }, [userInput]);

    useEffect(() => {
      if(chatHistoryRef.current){
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
      }
    }, [chatHistory])

    // Extract table styles to a constant
    const tableStyles = {
        margin: "20px auto",
        borderCollapse: "collapse",
        width: "80%"
    };

    // Extract chat container styles
    const chatContainerStyles = {
        margin: "20px auto",
        width: "60%"
    };

    const chatHistoryStyles = {
        border: "1px solid #ccc",
        padding: "10px",
        height: "300px",
        overflowY: "auto",
        marginBottom: "10px"
    };

    if (loading) {
        return <div style={{ textAlign: "center", marginTop: "20px" }}>Loading...</div>;
    }

     if (error) {
        return <div style={{ color: "red", textAlign: "center", marginTop: "20px" }}>Error: {error}</div>;
    }
    return (
        <ErrorBoundary>
            <div>
                <h1 style={{ textAlign: "center" }}>SFID Dashboard</h1>

                <DataTable data={data} loading={loading} error={error} tableStyles={tableStyles} />

                <hr />

                <div style={chatContainerStyles}>
                    <h2>Chatbot</h2>
                    <div
                        style={chatHistoryStyles}
                        role="log"
                        aria-live="polite"
                        ref={chatHistoryRef}
                    >
                        {chatHistory.map((chat, index) => (
                            <ChatMessage
                                key={index}
                                sender={chat.sender}
                                message={chat.message}
                                timestamp={chat.timestamp}
                            />
                        ))}
                    </div>
                    <ChatInput
                        userInput={userInput}
                        setUserInput={setUserInput}
                        handleSubmit={handleChatSubmit}
                        loading={loading}
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
};


export default App;