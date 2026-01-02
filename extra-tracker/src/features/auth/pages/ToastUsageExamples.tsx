/**
 * 📚 ESEMPIO D'USO DEL SISTEMA TOAST
 * 
 * Questo file mostra come usare il sistema di toast in diversi scenari.
 * NON è un componente da usare in produzione, ma una guida di riferimento.
 * 
 * 🎓 SCENARI COPERTI:
 * 1. Toast manuali nei componenti (successo, info, warning)
 * 2. Toast automatici da apiClient (errori API)
 * 3. Toast con azioni personalizzate
 * 4. Toast permanenti (senza auto-dismiss)
 */

import { useToast } from '../../../shared/components/toast';
import { apiClient } from '../../../shared/services/apiClient';

/**
 * ESEMPIO 1: Uso base in un componente
 * 
 * 🎓 PATTERN: Hook-based API
 * useToast() restituisce metodi per ogni tipo di toast.
 * È type-safe e autocomplete-friendly.
 */
export const BasicToastExample = () => {
    const toast = useToast();

    // Toast di successo semplice
    const handleSave = () => {
        toast.success('Modifiche salvate con successo!');
    };

    // Toast con titolo personalizzato
    const handleCreate = () => {
        toast.success('Il progetto è stato creato', {
            title: 'Progetto Creato',
        });
    };

    // Toast info
    const handleInfo = () => {
        toast.info('Ricordati di salvare prima di uscire');
    };

    // Toast warning
    const handleWarning = () => {
        toast.warning('Hai quasi raggiunto il limite giornaliero');
    };

    return (
        <div className="space-x-2">
            <button onClick={handleSave}>Salva</button>
            <button onClick={handleCreate}>Crea</button>
            <button onClick={handleInfo}>Info</button>
            <button onClick={handleWarning}>Warning</button>
        </div>
    );
};

/**
 * ESEMPIO 2: Form con gestione errori ibrida
 * 
 * 🎓 ARCHITETTURA: Gestione Errori Ibrida
 * - Errori API generici: gestiti automaticamente da apiClient → toast
 * - Successo: gestito manualmente nel componente → toast.success
 * - Errori di validazione: gestiti inline nel form (fieldErrors)
 * 
 * Questo approccio ti dà il meglio di entrambi i mondi:
 * - Non devi ripetere la logica di errore ovunque
 * - Puoi personalizzare i messaggi di successo per ogni azione
 */
export const FormWithToastExample = () => {
    const toast = useToast();

    const handleSubmit = async (data: { name: string }) => {
        try {
            // Chiamata API - gli errori sono gestiti automaticamente
            const response = await apiClient.post('/projects', data);
            
            if (response.success) {
                // Successo: toast manuale con messaggio specifico
                toast.success(`Progetto "${data.name}" creato con successo!`, {
                    title: '🎉 Fatto!',
                });
            }
        } catch (error) {
            // L'errore API mostra già un toast automatico
            // Qui puoi fare altre cose (es. logging, analytics)
            console.error('Errore creazione progetto:', error);
        }
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit({ name: 'Test' }); }}>
            {/* ... campi form ... */}
            <button type="submit">Crea Progetto</button>
        </form>
    );
};

/**
 * ESEMPIO 3: Toast con azione personalizzata
 * 
 * 🎓 USE CASE: Undo/Redo, Riprova, Naviga a dettaglio
 * I toast con azione permettono all'utente di reagire alla notifica.
 */
export const ToastWithActionExample = () => {
    const toast = useToast();

    const handleDelete = async () => {
        // Elimina item...
        
        // Toast con azione "Annulla"
        toast.success('Elemento eliminato', {
            title: 'Eliminato',
            duration: 8000, // Più tempo per cliccare "Annulla"
            action: {
                label: 'Annulla',
                onClick: () => {
                    // Ripristina l'elemento
                    toast.info('Eliminazione annullata');
                },
            },
        });
    };

    return <button onClick={handleDelete}>Elimina</button>;
};

/**
 * ESEMPIO 4: Toast permanente (senza auto-dismiss)
 * 
 * 🎓 USE CASE: Errori critici, Azioni richieste
 * Imposta duration: 0 per un toast che non scompare automaticamente.
 */
export const PermanentToastExample = () => {
    const toast = useToast();

    const handleCriticalError = () => {
        toast.error('Sessione scaduta. Effettua nuovamente il login.', {
            title: 'Sessione Scaduta',
            duration: 0, // Non scompare
            dismissible: true, // Ma può essere chiuso manualmente
            action: {
                label: 'Vai al Login',
                onClick: () => {
                    window.location.href = '/login';
                },
            },
        });
    };

    return <button onClick={handleCriticalError}>Simula Errore Critico</button>;
};

/**
 * ESEMPIO 5: Dismiss programmatico
 * 
 * 🎓 USE CASE: Operazioni lunghe, Loading states
 * Puoi salvare l'ID del toast e chiuderlo quando vuoi.
 */
export const DismissableToastExample = () => {
    const toast = useToast();

    const handleLongOperation = async () => {
        // Mostra toast di caricamento
        const loadingToastId = toast.info('Elaborazione in corso...', {
            title: 'Attendere',
            duration: 0, // Non auto-dismiss
            dismissible: false, // Non chiudibile dall'utente
        });

        try {
            // Simula operazione lunga
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Chiudi il toast di loading
            toast.dismiss(loadingToastId);
            
            // Mostra successo
            toast.success('Operazione completata!');
        } catch {
            toast.dismiss(loadingToastId);
            toast.error('Operazione fallita');
        }
    };

    return <button onClick={handleLongOperation}>Avvia Operazione Lunga</button>;
};

/**
 * ESEMPIO 6: Integrazione con Login Form
 * 
 * 🎓 BEST PRACTICE per form di autenticazione:
 * - Validazione inline (fieldErrors) per feedback immediato
 * - Toast per successo (feedback positivo)
 * - Errori API mostrati nel banner del form (più visibili per auth)
 */
export const LoginFormExample = () => {
    const toast = useToast();
    // const { login } = useAuth(); // Dal tuo AuthContext

    const handleLogin = async (email: string, password: string) => {
        try {
            // const response = await login({ email, password });
            const response = { success: true }; // Mock
            
            if (response.success) {
                toast.success('Accesso effettuato!', {
                    title: 'Benvenuto! 👋',
                });
                // navigate('/dashboard');
            }
        } catch (error) {
            // Per il login, potresti voler mostrare l'errore
            // sia come toast che nel form stesso
            // toast.error è già chiamato automaticamente da apiClient
            // Quindi qui puoi solo loggare o fare altro
            console.error('Login failed:', error);
        }
    };

    return (
        <button onClick={() => handleLogin('test@example.com', 'password')}>
            Login
        </button>
    );
};
