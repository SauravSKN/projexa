import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Import the REAL components to replace placeholder <div> elements
import AdminDashboard from '../pages/admin/Dashboard';
import GuideDashboard from '../pages/guide/Dashboard';
import TeamForm from '../components/team/TeamForm';
import ProjectForm from '../components/project/ProjectForm';
import GuideAssignModal from '../components/team/GuideAssignModal';
import ProtectedRoute from '../routes/ProtectedRoute';

// Import auth and api services
import * as authSession from '../services/authSession';
import * as teamApi from '../services/teamApi';
import * as projectApi from '../services/projectApi';

describe('PROJEXA FE2 Real Component Integration & Quality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. Task 1 Verification: Authentication & Demo Mode Constraints
  // =========================================================================
  describe('Authentication & Demo Mode Constraints (Task 1)', () => {
    test('defaults to unauthenticated session when demo mode is disabled', () => {
      expect(authSession.isDemoModeEnabled()).toBe(false);
      expect(authSession.getActiveDevRole()).toBeNull();
      const headers = authSession.getAuthHeaders();
      expect(headers['x-projexa-role']).toBeUndefined();
      expect(headers['x-projexa-user-id']).toBeUndefined();
      expect(headers['projexa_mock_mode']).toBeUndefined();
    });

    test('does not automatically log in as admin in development', () => {
      sessionStorage.removeItem(authSession.DEV_SESSION_KEY);
      sessionStorage.removeItem(authSession.DEMO_MODE_KEY);
      expect(authSession.getActiveDevRole()).toBeNull();
    });

    test('requires explicit opt-in for demo mode', () => {
      expect(authSession.isDemoModeEnabled()).toBe(false);

      // Explicit opt-in via helper
      authSession.setDemoMode(true);
      expect(authSession.isDemoModeEnabled()).toBe(true);

      // Explicit opt-out
      authSession.setDemoMode(false);
      expect(authSession.isDemoModeEnabled()).toBe(false);
      expect(authSession.getActiveDevRole()).toBeNull();
    });

    test('mock role headers are never sent in real API mode', () => {
      sessionStorage.removeItem(authSession.DEMO_MODE_KEY);
      sessionStorage.removeItem(authSession.DEV_SESSION_KEY);

      const headers = authSession.getAuthHeaders();
      expect(headers).toEqual({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      });
      expect(headers['x-projexa-role']).toBeUndefined();
      expect(headers['projexa_mock_mode']).toBeUndefined();
    });

    test('attaches mock headers ONLY when demo mode is explicitly enabled with a persona', () => {
      authSession.setDevSessionRole('admin');
      expect(authSession.isDemoModeEnabled()).toBe(true);
      expect(authSession.getActiveDevRole()).toBe('admin');

      const headers = authSession.getAuthHeaders();
      expect(headers['x-projexa-role']).toBe('admin');
      expect(headers['x-projexa-user-id']).toBe(authSession.DEV_PERSONAS.admin.id);
      expect(headers[authSession.MOCK_MODE_INDICATOR]).toBe('true');
    });
  });

  // =========================================================================
  // 2. Real Admin Dashboard Component Tests
  // =========================================================================
  describe('Admin Dashboard Component (Real)', () => {
    test('renders loading state initially', () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/Loading department portfolio metrics/i)).toBeInTheDocument();
    });

    test('renders live data metrics and guide workload table when API succeeds', async () => {
      const mockPayload = {
        success: true,
        data: {
          studentCount: 24,
          guideCount: 6,
          teamCount: 5,
          projectCount: 4,
          guideLoad: [
            { guideId: 'g1', guideName: 'Dr Ananya Shah', teamCount: 3 },
            { guideId: 'g2', guideName: 'Dr Rohan Mehta', teamCount: 2 },
          ],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      });

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Department Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Live Backend API')).toBeInTheDocument();
      expect(screen.getByText('Dr Ananya Shah')).toBeInTheDocument();
      expect(screen.getByText('Dr Rohan Mehta')).toBeInTheDocument();
    });

    test('renders real error state when API fails in real mode (demo mode disabled)', async () => {
      sessionStorage.removeItem(authSession.DEMO_MODE_KEY);

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network connection refused'));

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error loading metrics:/i)).toBeInTheDocument();
        expect(screen.getByText(/Network connection refused/i)).toBeInTheDocument();
      });
    });

    test('renders dev fixture preview when demo mode is enabled and API fails', async () => {
      authSession.setDemoMode(true);

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Backend offline'));

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Dev Fixture Preview')).toBeInTheDocument();
      });

      expect(screen.getByText('Dr Ananya Shah')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Real Guide Dashboard Component Tests
  // =========================================================================
  describe('Guide Dashboard Component (Real)', () => {
    test('renders loading state initially', () => {
      vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter>
          <GuideDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText(/Loading assigned projects & teams/i)).toBeInTheDocument();
    });

    test('renders assigned teams and project status on live API success', async () => {
      const mockPayload = {
        success: true,
        data: {
          assignedTeamCount: 2,
          projectCount: 2,
          assignedTeams: [
            { id: 'team-1', name: 'Alpha Squad', projectTitle: 'AI Drone Mapping' },
            { id: 'team-2', name: 'Beta Innovators', projectTitle: 'Solar Power Optimizer' },
          ],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      });

      render(
        <MemoryRouter>
          <GuideDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Squad')).toBeInTheDocument();
      });

      expect(screen.getByText('Beta Innovators')).toBeInTheDocument();
      expect(screen.getByText(/AI Drone Mapping/i)).toBeInTheDocument();
      expect(screen.getByText(/Solar Power Optimizer/i)).toBeInTheDocument();
      expect(screen.getByText('Live Backend API')).toBeInTheDocument();
    });

    test('renders real empty state when guide has zero assigned teams', async () => {
      const mockPayload = {
        success: true,
        data: {
          assignedTeamCount: 0,
          projectCount: 0,
          assignedTeams: [],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      });

      render(
        <MemoryRouter>
          <GuideDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Teams Currently Assigned')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/The department administrator has not allocated any capstone teams/i)
      ).toBeInTheDocument();
    });

    test('renders real error state when API fails in real mode', async () => {
      sessionStorage.removeItem(authSession.DEMO_MODE_KEY);

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Gateway Timeout 504'));

      render(
        <MemoryRouter>
          <GuideDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error loading guide summary:/i)).toBeInTheDocument();
        expect(screen.getByText(/Gateway Timeout 504/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 4. Real TeamForm Component Tests
  // =========================================================================
  describe('TeamForm Component (Real)', () => {
    const mockStudents = [
      { id: 's1', fullName: 'Student One', email: 's1@demo.invalid' },
      { id: 's2', fullName: 'Student Two', email: 's2@demo.invalid' },
      { id: 's3', fullName: 'Student Three', email: 's3@demo.invalid' },
      { id: 's4', fullName: 'Student Four', email: 's4@demo.invalid' },
      { id: 's5', fullName: 'Student Five', email: 's5@demo.invalid' },
      { id: 's6', fullName: 'Student Six', email: 's6@demo.invalid' },
    ];
    const mockGuides = [
      { id: 'g1', fullName: 'Dr Ananya Shah', teamCount: 1, department: 'CS' },
    ];

    beforeEach(() => {
      vi.spyOn(teamApi, 'getEligibleStudents').mockResolvedValue({
        success: true,
        data: mockStudents,
      });
      vi.spyOn(teamApi, 'getEligibleGuides').mockResolvedValue({
        success: true,
        data: mockGuides,
      });
    });

    test('enforces client validation for team name and minimum 3 students', async () => {
      render(<TeamForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /create team/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Team name is required')).toBeInTheDocument();
      expect(
        screen.getByText(/Please select at least 3 students \(currently selected: 0\)/i)
      ).toBeInTheDocument();
    });

    test('enforces maximum 5 student boundary', async () => {
      render(<TeamForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });

      // Select 5 students
      fireEvent.click(screen.getByText('Student One'));
      fireEvent.click(screen.getByText('Student Two'));
      fireEvent.click(screen.getByText('Student Three'));
      fireEvent.click(screen.getByText('Student Four'));
      fireEvent.click(screen.getByText('Student Five'));

      // Try selecting a 6th student
      fireEvent.click(screen.getByText('Student Six'));

      expect(screen.getByText('Maximum 5 students allowed per team')).toBeInTheDocument();
    });

    test('submits successfully with valid team data and triggers onSuccess', async () => {
      const onSuccessMock = vi.fn();
      vi.spyOn(teamApi, 'createTeam').mockResolvedValueOnce({
        success: true,
        data: { id: 'team-new', name: 'Cyber Titans' },
      });

      render(<TeamForm onSuccess={onSuccessMock} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });

      // Type team name using placeholder
      const nameInput = screen.getByPlaceholderText(/Autonomous Vision Team/i);
      await userEvent.type(nameInput, 'Cyber Titans');

      // Select 3 students
      fireEvent.click(screen.getByText('Student One'));
      fireEvent.click(screen.getByText('Student Two'));
      fireEvent.click(screen.getByText('Student Three'));

      const submitBtn = screen.getByRole('button', { name: /create team/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(teamApi.createTeam).toHaveBeenCalledWith({
          name: 'Cyber Titans',
          session: '2026-27',
          memberIds: ['s1', 's2', 's3'],
          guideId: null,
        });
        expect(onSuccessMock).toHaveBeenCalledWith({ id: 'team-new', name: 'Cyber Titans' });
      });
    });
  });

  // =========================================================================
  // 5. Real ProjectForm Component Tests
  // =========================================================================
  describe('ProjectForm Component (Real)', () => {
    const mockTeams = [
      { id: 'team-1', name: 'Alpha Squad', session: '2026-27' },
      { id: 'team-2', name: 'Beta Innovators', session: '2026-27' },
    ];

    beforeEach(() => {
      vi.spyOn(teamApi, 'getTeams').mockResolvedValue({
        success: true,
        data: mockTeams,
      });
    });

    test('enforces required title validation', async () => {
      render(<ProjectForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Alpha Squad/)).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /register project/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Project title is required')).toBeInTheDocument();
    });

    test('enforces date chronological validation (targetDate must be after startDate)', async () => {
      const { container } = render(<ProjectForm onSuccess={vi.fn()} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Alpha Squad/)).toBeInTheDocument();
      });

      // Type title
      const titleInput = screen.getByPlaceholderText(/Distributed Consensus Engine/i);
      await userEvent.type(titleInput, 'Smart Campus IoT');

      // Set invalid dates: target date BEFORE start date
      const dateInputs = container.querySelectorAll('input[type="date"]');
      const startDateInput = dateInputs[0];
      const targetDateInput = dateInputs[1];

      fireEvent.change(startDateInput, { target: { value: '2026-11-01' } });
      fireEvent.change(targetDateInput, { target: { value: '2026-10-01' } });

      const submitBtn = screen.getByRole('button', { name: /register project/i });
      fireEvent.click(submitBtn);

      expect(
        screen.getByText('Target completion date must be strictly after the start date')
      ).toBeInTheDocument();
    });

    test('submits successfully with valid data and calls onSuccess', async () => {
      const onSuccessMock = vi.fn();
      vi.spyOn(projectApi, 'createProject').mockResolvedValueOnce({
        success: true,
        data: { id: 'p-1', title: 'Solar Tracking Array' },
      });

      render(<ProjectForm onSuccess={onSuccessMock} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Alpha Squad/)).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText(/Distributed Consensus Engine/i);
      await userEvent.type(titleInput, 'Solar Tracking Array');

      const submitBtn = screen.getByRole('button', { name: /register project/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(projectApi.createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Solar Tracking Array',
            teamId: 'team-1',
            status: 'active',
          })
        );
        expect(onSuccessMock).toHaveBeenCalledWith({ id: 'p-1', title: 'Solar Tracking Array' });
      });
    });
  });

  // =========================================================================
  // 6. Real GuideAssignModal Component Tests
  // =========================================================================
  describe('GuideAssignModal Component (Real)', () => {
    const mockTeam = {
      id: 'team-101',
      name: 'Projexa Demo Team',
      session: '2026-27',
      guideId: 'g1',
    };

    const mockGuides = [
      { id: 'g1', fullName: 'Dr Ananya Shah', teamCount: 1, department: 'CS' },
      { id: 'g2', fullName: 'Dr Rohan Mehta', teamCount: 0, department: 'CS' },
    ];

    beforeEach(() => {
      vi.spyOn(teamApi, 'getEligibleGuides').mockResolvedValue({
        success: true,
        data: mockGuides,
      });
    });

    test('renders modal with team details and guide list', async () => {
      render(
        <GuideAssignModal team={mockTeam} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      expect(screen.getByText(/Assign \/ Reassign Faculty Guide/i)).toBeInTheDocument();
      expect(screen.getByText('Projexa Demo Team')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Dr Ananya Shah')).toBeInTheDocument();
        expect(screen.getByText('Dr Rohan Mehta')).toBeInTheDocument();
      });
    });

    test('reassigns guide on selection and triggers onSuccess & onClose', async () => {
      const onSuccessMock = vi.fn();
      const onCloseMock = vi.fn();

      vi.spyOn(teamApi, 'assignTeamGuide').mockResolvedValueOnce({
        success: true,
        data: { teamId: 'team-101', guideId: 'g2' },
      });

      render(
        <GuideAssignModal team={mockTeam} onClose={onCloseMock} onSuccess={onSuccessMock} />
      );

      await waitFor(() => {
        expect(screen.getByText('Dr Rohan Mehta')).toBeInTheDocument();
      });

      // Select Dr Rohan Mehta
      const rohanRadio = screen.getByDisplayValue('g2');
      fireEvent.click(rohanRadio);

      const saveBtn = screen.getByRole('button', { name: /save guide assignment/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(teamApi.assignTeamGuide).toHaveBeenCalledWith('team-101', 'g2');
        expect(onSuccessMock).toHaveBeenCalledWith({ teamId: 'team-101', guideId: 'g2' });
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    test('invokes onClose when close button is clicked', async () => {
      const onCloseMock = vi.fn();
      render(
        <GuideAssignModal team={mockTeam} onClose={onCloseMock} onSuccess={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Dr Ananya Shah')).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: '✕' });
      fireEvent.click(closeBtn);

      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Real ProtectedRoute Component Tests
  // =========================================================================
  describe('ProtectedRoute Component (Real Authorization & Guards)', () => {
    test('renders authentication required screen when user is unauthenticated', () => {
      sessionStorage.clear();

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<div>Secret Admin Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(
        screen.getByText('You must be logged in with an active session to access this portal.')
      ).toBeInTheDocument();
      expect(screen.queryByText('Secret Admin Dashboard')).not.toBeInTheDocument();
    });

    test('renders 403 Access Denied when role does not match allowedRoles', () => {
      authSession.setDevSessionRole('guide');

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<div>Secret Admin Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('403')).toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText(/does not have permission to access this area/i)
      ).toBeInTheDocument();
      expect(screen.queryByText('Secret Admin Dashboard')).not.toBeInTheDocument();
    });

    test('renders protected content when user has authorized role', () => {
      authSession.setDevSessionRole('admin');

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<div>Secret Admin Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Secret Admin Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('403')).not.toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });
});
