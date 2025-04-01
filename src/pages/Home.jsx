import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome to the Chat App</h1>
      <div className="flex space-x-4">
        <Link to="/login">
          <button className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600">
            Login
          </button>
        </Link>
        <Link to="/register">
          <button className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600">
            Register
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
