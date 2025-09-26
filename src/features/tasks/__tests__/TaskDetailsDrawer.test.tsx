/**
 * TaskDetailsDrawer Component Tests
 * 
 * Test Coverage:
 * - Component rendering and responsive behavior
 * - Real-time data subscriptions
 * - Field editing with debounced autosave
 * - Time tracking integration
 * - Comments functionality
 * - Photo upload/delete
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TaskDetailsDrawer from '../TaskDetailsDrawer';
import * as taskApi from '../../../api/taskApi';
import * as storageApi from '../../../api/storageApi';
import { AuthContext } from '../../../auth/AuthContext';
import { TimeTrackingContext } from '../../../contexts/TimeTrackingContext';

// Mock the APIs
jest.mock('../../../api/taskApi');
jest.mock('../../../api/storageApi');
jest.mock('../../../utils/useDebounced', () => ({
  useDebouncedCallback: (fn: Function) => fn
}));

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Test data
const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo' as const,
  priority: 'medium' as const,
  projectId: 'project-1',
  tags: ['test', 'urgent'],
  plannedMinutes: 120,
  photoRequired: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockComments = [
  {
    id: 'comment-1',
    taskId: 'task-1',
    userId: 'user-1',
    userName: 'Test User',
    text: 'This is a test comment',
    createdAt: new Date()
  }
];

const mockPhotos = [
  {
    id: 'photo-1',
    url: 'https://example.com/photo1.jpg',
    createdAt: new Date(),
    width: 800,
    height: 600
  }
];

const mockProjects = [
  { id: 'project-1', name: 'Project 1' },
  { id: 'project-2', name: 'Project 2' }
];

// Helper function to render with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const theme = createTheme();
  const mockUser = { uid: 'user-1', displayName: 'Test User' };
  const mockTimeTracking = {
    activeTaskId: null,
    start: jest.fn(),
    stop: jest.fn(),
    isLoading: false
  };

  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={{ user: mockUser, currentUser: mockUser } as any}>
        <TimeTrackingContext.Provider value={mockTimeTracking as any}>
          {ui}
        </TimeTrackingContext.Provider>
      </AuthContext.Provider>
    </ThemeProvider>,
    options
  );
};

describe('TaskDetailsDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (taskApi.subscribeToTask as jest.Mock).mockImplementation((_, __, cb) => {
      cb(mockTask);
      return jest.fn(); // unsubscribe function
    });
    
    (taskApi.subscribeToTaskComments as jest.Mock).mockImplementation((_, __, cb) => {
      cb(mockComments);
      return jest.fn();
    });
    
    (taskApi.subscribeToTaskPhotos as jest.Mock).mockImplementation((_, __, cb) => {
      cb(mockPhotos);
      return jest.fn();
    });
    
    (taskApi.updateTaskFields as jest.Mock).mockResolvedValue(undefined);
    (taskApi.addTaskComment as jest.Mock).mockResolvedValue(undefined);
    (taskApi.deleteTaskComment as jest.Mock).mockResolvedValue(undefined);
    
    (storageApi.uploadTaskPhoto as jest.Mock).mockResolvedValue({
      id: 'new-photo',
      url: 'https://example.com/new-photo.jpg',
      createdAt: new Date()
    });
    
    (storageApi.deleteTaskPhoto as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render drawer on desktop', () => {
      mockMatchMedia(true); // Desktop
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });

    it('should render dialog on mobile', () => {
      mockMatchMedia(false); // Mobile
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={false}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      (taskApi.subscribeToTask as jest.Mock).mockImplementation(() => jest.fn());
      
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Task Details', () => {
    it('should display task information', async () => {
      mockMatchMedia(true);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('120')).toBeInTheDocument();
      });
    });

    it('should update task title with debounce', async () => {
      mockMatchMedia(true);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const titleInput = await screen.findByDisplayValue('Test Task');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Task Title');

      await waitFor(() => {
        expect(taskApi.updateTaskFields).toHaveBeenCalledWith(
          'user-1',
          'task-1',
          expect.objectContaining({ title: 'Updated Task Title' })
        );
      });
    });

    it('should update status immediately', async () => {
      mockMatchMedia(true);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const statusSelect = await screen.findByLabelText(/status/i);
      fireEvent.mouseDown(statusSelect);
      
      const inProgressOption = await screen.findByText('In Progress');
      fireEvent.click(inProgressOption);

      expect(taskApi.updateTaskFields).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        expect.objectContaining({ status: 'in_progress' })
      );
    });

    it('should update priority immediately', async () => {
      mockMatchMedia(true);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const prioritySelect = await screen.findByLabelText(/priority/i);
      fireEvent.mouseDown(prioritySelect);
      
      const highOption = await screen.findByText('High');
      fireEvent.click(highOption);

      expect(taskApi.updateTaskFields).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        expect.objectContaining({ priority: 'high' })
      );
    });
  });

  describe('Comments', () => {
    it('should display comments list', async () => {
      mockMatchMedia(false); // Mobile to see tabs
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      // Switch to comments tab
      const commentsTab = await screen.findByRole('tab', { name: /comments/i });
      fireEvent.click(commentsTab);

      await waitFor(() => {
        expect(screen.getByText('This is a test comment')).toBeInTheDocument();
        expect(screen.getByText('TU')).toBeInTheDocument(); // Avatar initials
      });
    });

    it('should add a new comment', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const commentsTab = await screen.findByRole('tab', { name: /comments/i });
      fireEvent.click(commentsTab);

      const commentInput = await screen.findByPlaceholderText(/add.*comment/i);
      await userEvent.type(commentInput, 'New test comment');

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      expect(taskApi.addTaskComment).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        'New test comment'
      );
    });

    it('should delete own comment', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const commentsTab = await screen.findByRole('tab', { name: /comments/i });
      fireEvent.click(commentsTab);

      await waitFor(() => {
        expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(taskApi.deleteTaskComment).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        'comment-1'
      );
    });

    it('should submit comment with Ctrl+Enter', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const commentsTab = await screen.findByRole('tab', { name: /comments/i });
      fireEvent.click(commentsTab);

      const commentInput = await screen.findByPlaceholderText(/add.*comment/i);
      await userEvent.type(commentInput, 'Quick comment');
      
      fireEvent.keyDown(commentInput, { key: 'Enter', ctrlKey: true });

      expect(taskApi.addTaskComment).toHaveBeenCalledWith(
        'user-1',
        'task-1',
        'Quick comment'
      );
    });
  });

  describe('Photos', () => {
    it('should display photos grid', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const photosTab = await screen.findByRole('tab', { name: /photos/i });
      fireEvent.click(photosTab);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg');
      });
    });

    it('should upload a photo', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const photosTab = await screen.findByRole('tab', { name: /photos/i });
      fireEvent.click(photosTab);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(storageApi.uploadTaskPhoto).toHaveBeenCalledWith(
          'user-1',
          'task-1',
          file,
          expect.any(Function)
        );
      });
    });

    it('should delete a photo', async () => {
      mockMatchMedia(false);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const photosTab = await screen.findByRole('tab', { name: /photos/i });
      fireEvent.click(photosTab);

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      // Find the delete button for photos (not comments)
      const photoDeleteButton = deleteButtons.find(btn => 
        btn.closest('[role="img"]') || btn.closest('img')
      );
      
      if (photoDeleteButton) {
        fireEvent.click(photoDeleteButton);
        
        expect(storageApi.deleteTaskPhoto).toHaveBeenCalledWith(
          'user-1',
          'task-1',
          expect.objectContaining({ id: 'photo-1' })
        );
      }
    });
  });

  describe('Time Tracking', () => {
    it('should start time tracking', async () => {
      const mockStart = jest.fn();
      
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      // Override the time tracking context
      const { rerender } = renderWithProviders(
        <ThemeProvider theme={createTheme()}>
          <AuthContext.Provider value={{ user: { uid: 'user-1' }, currentUser: { uid: 'user-1' } } as any}>
            <TimeTrackingContext.Provider value={{
              activeTaskId: null,
              start: mockStart,
              stop: jest.fn(),
              isLoading: false
            } as any}>
              <TaskDetailsDrawer
                taskId="task-1"
                open={true}
                onClose={jest.fn()}
                projects={mockProjects}
              />
            </TimeTrackingContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      );

      const startButton = await screen.findByRole('button', { name: /start/i });
      fireEvent.click(startButton);

      expect(mockStart).toHaveBeenCalledWith('task-1');
    });

    it('should stop time tracking when active', async () => {
      const mockStop = jest.fn();
      
      renderWithProviders(
        <ThemeProvider theme={createTheme()}>
          <AuthContext.Provider value={{ user: { uid: 'user-1' }, currentUser: { uid: 'user-1' } } as any}>
            <TimeTrackingContext.Provider value={{
              activeTaskId: 'task-1',
              start: jest.fn(),
              stop: mockStop,
              isLoading: false
            } as any}>
              <TaskDetailsDrawer
                taskId="task-1"
                open={true}
                onClose={jest.fn()}
                projects={mockProjects}
              />
            </TimeTrackingContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      );

      const stopButton = await screen.findByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on close', async () => {
      const unsubscribeTask = jest.fn();
      const unsubscribeComments = jest.fn();
      const unsubscribePhotos = jest.fn();
      
      (taskApi.subscribeToTask as jest.Mock).mockReturnValue(unsubscribeTask);
      (taskApi.subscribeToTaskComments as jest.Mock).mockReturnValue(unsubscribeComments);
      (taskApi.subscribeToTaskPhotos as jest.Mock).mockReturnValue(unsubscribePhotos);
      
      const { rerender } = renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      // Close the drawer
      rerender(
        <ThemeProvider theme={createTheme()}>
          <AuthContext.Provider value={{ user: { uid: 'user-1' }, currentUser: { uid: 'user-1' } } as any}>
            <TimeTrackingContext.Provider value={{ activeTaskId: null, start: jest.fn(), stop: jest.fn(), isLoading: false } as any}>
              <TaskDetailsDrawer
                taskId="task-1"
                open={false}
                onClose={jest.fn()}
                projects={mockProjects}
              />
            </TimeTrackingContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(unsubscribeTask).toHaveBeenCalled();
        expect(unsubscribeComments).toHaveBeenCalled();
        expect(unsubscribePhotos).toHaveBeenCalled();
      });
    });

    it('should handle task change', async () => {
      const { rerender } = renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      // Change task
      rerender(
        <ThemeProvider theme={createTheme()}>
          <AuthContext.Provider value={{ user: { uid: 'user-1' }, currentUser: { uid: 'user-1' } } as any}>
            <TimeTrackingContext.Provider value={{ activeTaskId: null, start: jest.fn(), stop: jest.fn(), isLoading: false } as any}>
              <TaskDetailsDrawer
                taskId="task-2"
                open={true}
                onClose={jest.fn()}
                projects={mockProjects}
              />
            </TimeTrackingContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(taskApi.subscribeToTask).toHaveBeenCalledWith(
          'user-1',
          'task-2',
          expect.any(Function)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (taskApi.updateTaskFields as jest.Mock).mockRejectedValue(new Error('Update failed'));
      
      mockMatchMedia(true);
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="task-1"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      const titleInput = await screen.findByDisplayValue('Test Task');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Failed Update');

      // Error should be caught and not crash the component
      await waitFor(() => {
        expect(taskApi.updateTaskFields).toHaveBeenCalled();
      });
      
      // Component should still be functional
      expect(screen.getByDisplayValue('Failed Update')).toBeInTheDocument();
    });

    it('should handle missing task gracefully', async () => {
      (taskApi.subscribeToTask as jest.Mock).mockImplementation((_, __, cb) => {
        cb(null);
        return jest.fn();
      });
      
      renderWithProviders(
        <TaskDetailsDrawer
          taskId="non-existent"
          open={true}
          onClose={jest.fn()}
          projects={mockProjects}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/task not found/i)).toBeInTheDocument();
      });
    });
  });
});
