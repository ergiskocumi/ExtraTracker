import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../LoginPage';
import { useAuth } from '../../context/AuthContext';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe('LoginPage theme contract', () => {
    const loginMock = vi.fn();

    beforeEach(() => {
        navigateMock.mockReset();
        loginMock.mockResolvedValue({ success: true });

        mockedUseAuth.mockReturnValue({
            login: loginMock,
            isLoading: false,
            error: null,
            clearError: vi.fn(),
        } as unknown as ReturnType<typeof useAuth>);
    });

    it('renders light-tuning semantic classes for key controls', () => {
        const { container } = render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        expect(container.querySelector('.login-page')).toBeInTheDocument();
        expect(container.querySelector('.login-shell')).toBeInTheDocument();
        expect(container.querySelector('.login-card')).toBeInTheDocument();
        expect(container.querySelector('.login-divider')).toBeInTheDocument();

        expect(screen.getByPlaceholderText('nome@esempio.it')).toHaveClass('login-input');
        expect(screen.getByPlaceholderText('••••••••')).toHaveClass('login-input');

        const submit = screen.getByRole('button', { name: /Accedi/i });
        expect(submit).toHaveClass('login-submit-btn');
        expect(submit).toHaveClass('keep-light-text');

        expect(container.querySelector('.login-password-toggle')).toBeInTheDocument();
    });

    it('submits valid credentials through auth context', async () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), {
            target: { value: 'utente@example.com' },
        });

        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

        expect(loginMock).toHaveBeenCalledWith({
            email: 'utente@example.com',
            password: 'password123',
        });
    });
});
