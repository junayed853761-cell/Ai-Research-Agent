import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Settings() {
  const { user, login, logout, deleteHistory } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full" />}
                <div>
                  <p className="font-medium text-lg">{user.displayName}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <button 
                onClick={logout}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">You are not signed in. Sign in to sync your chat history.</p>
              <button 
                onClick={login}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Sign In with Google
              </button>
            </div>
          )}
        </section>

        {user && (
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-rose-500 mb-4">Danger Zone</h2>
            <p className="text-muted-foreground mb-4">
              Permanently delete all your research history and saved reports. This action cannot be undone.
            </p>
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete all chat history?')) {
                  deleteHistory();
                }
              }}
              className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors border border-rose-500/20"
            >
              Delete Chat History
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
