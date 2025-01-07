import './App.css';
import AppRoutes from './routes';
import { UserProvider } from './context/userContext';

function App() {
  return (
    <div className="App">
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </div>
  );
}

export default App;
