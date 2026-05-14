// Root App. Branches on auth state (mimics app/page.tsx + /inbox).
const { useState: _appUS } = React;

function App() {
  const [session, setSession] = useState(MOCK.SESSION);
  const [route, setRoute] = useState('inbox'); // 'inbox' | 'preferences'

  const handleSignIn = () => setSession(MOCK.SESSION);
  const handleSignOut = () => { setSession({ status: 'unauthenticated', user: null }); setRoute('inbox'); };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && route === 'preferences') setRoute('inbox');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [route]);

  if (session.status !== 'authenticated') {
    return <SignInGate onSignIn={handleSignIn} />;
  }

  if (route === 'preferences') {
    return <PreferencesPage session={session} onBack={() => setRoute('inbox')} onSignOut={handleSignOut} />;
  }

  return <InboxView session={session} onSignOut={handleSignOut} onOpenPreferences={() => setRoute('preferences')} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
