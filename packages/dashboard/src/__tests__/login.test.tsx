import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock next-auth/react
const mockSignIn = vi.fn()
vi.mock('next-auth/react', () => ({
  signIn: mockSignIn,
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockGet = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}))

// Import after mocks
const { default: LoginPage } = await import('@/app/(auth)/login/page')

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null) // no callbackUrl by default
  })

  it('renders the login form', () => {
    render(<LoginPage />)

    expect(screen.getByText('Eyes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows email and password inputs', () => {
    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('shows loading state on submit', async () => {
    const user = userEvent.setup()
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })

  it('displays error on invalid credentials', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'correctpassword')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('redirects to callbackUrl on successful login', async () => {
    const user = userEvent.setup()
    mockGet.mockReturnValue('/visitors')
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'correctpassword')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/visitors')
    })
  })

  it('calls signIn with credentials provider', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })
  })

  it('handles thrown errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValueOnce(new Error('Network error'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })
})
