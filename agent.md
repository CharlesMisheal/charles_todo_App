Taskly

Build Taskly, a modern, clean, responsive to-do list application.

Goal

Create a polished productivity app that allows users to manage their tasks easily without requiring authentication or a backend.

Keep the implementation simple, maintainable, and practical. Do not over-engineer the project.

Core Features

Users should be able to:

- Add tasks
- Edit tasks
- Delete tasks
- Mark tasks as completed or active
- Add a description
- Set priority: Low, Medium, High
- Set a due date
- Add tags
- Search tasks
- Filter tasks by:
  - All
  - Active
  - Completed
  - Today
  - Overdue
- Sort tasks by:
  - Newest
  - Oldest
  - Due date
  - Priority
- Clear completed tasks
- See the total and remaining task counts

Persistence

Store tasks locally so they remain available after refreshing or reopening the application.

Authentication and user accounts are not required.

Use "localStorage" unless the chosen technology makes another simple local-storage solution more appropriate.

UI/UX

The interface should look modern, professional, and minimal.

Requirements:

- Responsive on mobile, tablet, and desktop
- Light and dark mode
- Clean typography and spacing
- Clear visual hierarchy
- Smooth but subtle transitions
- Accessible buttons and form controls
- Good empty states
- Useful feedback/toast messages after important actions
- Confirmation or undo for destructive actions

Avoid excessive animations, gradients, decorative elements, or unnecessary complexity.

Task Details

A task should support:

- Title
- Description
- Completion status
- Priority
- Due date
- Tags
- Created/updated timestamps

Data Portability

Allow users to:

- Export their tasks as JSON
- Import tasks from JSON

Validate imported data so invalid files do not break the application.

Accessibility

Use semantic HTML and make the application keyboard-friendly.

Ensure:

- Forms have proper labels
- Buttons are accessible
- Focus states are visible
- Color is not the only way information is communicated
- Dialogs can be closed with Escape

Code Quality

Use clean, readable, maintainable code.

Avoid unnecessary dependencies and complicated architecture.

If TypeScript is available in the project, use it.

Keep components and functions focused and reusable.

Do not introduce a backend or authentication system.

Testing

Add basic tests for the most important functionality:

- Creating a task
- Editing a task
- Completing a task
- Deleting a task
- Searching/filtering
- Local persistence

Final Requirements

Before finishing:

- Ensure the application builds successfully
- Fix errors and warnings where practical
- Test the main user flows
- Check mobile and desktop layouts
- Check both light and dark modes
- Remove unused code and placeholder functionality
- Provide a clear README with setup and run instructions

Important

Build a simple but polished to-do application.

Do not add features just because they are possible.

Focus on making the core experience excellent.