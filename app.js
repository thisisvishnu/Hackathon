import React, { useState, useEffect } from "react";
import Login from "./login";
import CPGDashboard from "./dashboard";
import ChatBot from './chatbot';

function App() {
  const [currentPage, setCurrentPage] = useState("login");

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        setCurrentPage(event.state.page);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial state
    window.history.replaceState({ page: currentPage }, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLoginSuccess = () => {
    setCurrentPage("dashboard");
    window.history.pushState({ page: "dashboard" }, '', '/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('email');
    setCurrentPage("login");
    window.history.pushState({ page: "login" }, '', '/login');
  };

  const handleNavigateToChatBot = () => {
    setCurrentPage("chatbot");
    window.history.pushState({ page: "chatbot" }, '', '/chatbot');
  };

  const handleBackToDashboard = () => {
    setCurrentPage("dashboard");
    window.history.pushState({ page: "dashboard" }, '', '/dashboard');
  };

  return (
    <>
      {currentPage === "login" && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {currentPage === "dashboard" && (
        <CPGDashboard 
          onLogout={handleLogout}
          onNavigateToChatBot={handleNavigateToChatBot}
        />
      )}
      {currentPage === "chatbot" && (
        <ChatBot onBackToDashboard={handleBackToDashboard} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
