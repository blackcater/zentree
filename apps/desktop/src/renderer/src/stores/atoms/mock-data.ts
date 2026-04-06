import type { Project } from '@renderer/types/project'
import type { Thread } from '@renderer/types/thread'

export const mockProjects: Project[] = [
	{ id: 'proj-1', title: 'Frontend Development', order: 0 },
	{ id: 'proj-2', title: 'Backend API', order: 1 },
	{ id: 'proj-3', title: 'Design System', order: 2 },
	{ id: 'proj-4', title: 'DevOps & Infrastructure', order: 3 },
	{ id: 'proj-5', title: 'Mobile App', order: 4 },
]

const now = new Date()
const hour = 60 * 60 * 1000
const day = 24 * hour

export const mockThreads: Thread[] = [
	// Frontend Development
	{
		id: 'thread-1',
		title: 'Implement user authentication flow',
		projectId: 'proj-1',
		updatedAt: new Date(now.getTime() - 2 * hour),
		createdAt: new Date(now.getTime() - 3 * day),
		isPinned: false,
	},
	{
		id: 'thread-2',
		title: 'Dashboard performance optimization',
		projectId: 'proj-1',
		updatedAt: new Date(now.getTime() - 5 * hour),
		createdAt: new Date(now.getTime() - 1 * day),
		isPinned: false,
	},
	{
		id: 'thread-3',
		title: 'Fix responsive layout issues on tablet',
		projectId: 'proj-1',
		updatedAt: new Date(now.getTime() - 1 * day),
		createdAt: new Date(now.getTime() - 2 * day),
		isPinned: false,
	},
	{
		id: 'thread-4',
		title: 'Implement dark mode toggle',
		projectId: 'proj-1',
		updatedAt: new Date(now.getTime() - 6 * hour),
		createdAt: new Date(now.getTime() - 7 * day),
		isPinned: true,
	},

	// Backend API
	{
		id: 'thread-5',
		title: 'Design REST API endpoints for user management',
		projectId: 'proj-2',
		updatedAt: new Date(now.getTime() - 3 * hour),
		createdAt: new Date(now.getTime() - 5 * day),
		isPinned: false,
	},
	{
		id: 'thread-6',
		title: 'Implement rate limiting middleware',
		projectId: 'proj-2',
		updatedAt: new Date(now.getTime() - 12 * hour),
		createdAt: new Date(now.getTime() - 4 * day),
		isPinned: false,
	},
	{
		id: 'thread-7',
		title: 'Database migration strategy',
		projectId: 'proj-2',
		updatedAt: new Date(now.getTime() - 2 * day),
		createdAt: new Date(now.getTime() - 10 * day),
		isPinned: true,
	},

	// Design System
	{
		id: 'thread-8',
		title: 'Create button component variants',
		projectId: 'proj-3',
		updatedAt: new Date(now.getTime() - 8 * hour),
		createdAt: new Date(now.getTime() - 6 * day),
		isPinned: false,
	},
	{
		id: 'thread-9',
		title: 'Design token documentation',
		projectId: 'proj-3',
		updatedAt: new Date(now.getTime() - 1 * day),
		createdAt: new Date(now.getTime() - 3 * day),
		isPinned: false,
	},

	// DevOps & Infrastructure
	{
		id: 'thread-10',
		title: 'CI/CD pipeline setup with GitHub Actions',
		projectId: 'proj-4',
		updatedAt: new Date(now.getTime() - 4 * hour),
		createdAt: new Date(now.getTime() - 8 * day),
		isPinned: false,
	},
	{
		id: 'thread-11',
		title: 'Docker containerization for microservices',
		projectId: 'proj-4',
		updatedAt: new Date(now.getTime() - 2 * day),
		createdAt: new Date(now.getTime() - 12 * day),
		isPinned: false,
	},

	// Mobile App
	{
		id: 'thread-12',
		title: 'React Native navigation setup',
		projectId: 'proj-5',
		updatedAt: new Date(now.getTime() - 10 * hour),
		createdAt: new Date(now.getTime() - 2 * day),
		isPinned: false,
	},
	{
		id: 'thread-13',
		title: 'Push notifications integration',
		projectId: 'proj-5',
		updatedAt: new Date(now.getTime() - 18 * hour),
		createdAt: new Date(now.getTime() - 9 * day),
		isPinned: true,
	},
	{
		id: 'thread-14',
		title: 'Offline data sync strategy',
		projectId: 'proj-5',
		updatedAt: new Date(now.getTime() - 3 * day),
		createdAt: new Date(now.getTime() - 15 * day),
		isPinned: false,
	},
]

export const mockPinnedThreadIds = ['thread-5', 'thread-11']
