# Study Smarter

**A smarter way to plan your studies, stay consistent, and track your progress.**

Study Smarter is a web-based study-planning project designed to help students organize their academic workload, build realistic study plans, and turn daily goals into manageable tasks.

## Features

- **Personalized study planning** — Organize study goals around your subjects, available time, and priorities.
- **AI-assisted plan generation** — Generate study plans using a configured AI provider.
- **Daily planner** — Break a larger study plan into actionable daily tasks.
- **Progress tracking** — Track completed tasks and monitor daily progress.
- **Daily reflection** — Record what went well, identify difficulties, and decide which subjects need more attention.
- **Google sign-in** — Authenticate using Firebase Authentication.
- **Cloud synchronization** — Store and synchronize supported planner data using Cloud Firestore.
- **Responsive interface** — Designed for use across different screen sizes.

*Feature availability depends on the current application configuration and connected services.*

## Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety |
| Vite | Development server and production builds |
| Tailwind CSS | Styling |
| Radix UI | Accessible interface primitives |
| Framer Motion | UI animations |
| Lucide React | Icons |
| Firebase Authentication | User authentication |
| Cloud Firestore | Cloud data storage |
| pnpm | Package management and workspace tooling |

## AI Provider Configuration

AI-powered plan generation requires a supported provider and valid credentials.

- Configure the provider and model expected by the application's AI integration.
- Store secret API keys in server-side environment variables or a secure backend.
- Do not commit real API keys to GitHub or expose private provider credentials in client-side code.
- Check the provider's model availability, rate limits, and usage restrictions if generation fails.

The exact environment variable names and server configuration should match the implementation in the current repository.

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Make focused changes that follow the existing project conventions.
4. Run the available type checks and production build.
5. Submit a pull request describing your changes.

## License

The root `package.json` declares the MIT license. Check the repository's license files before redistributing the project.

## Author

Developed by [Sanskar Panwar](https://github.com/sanskarpanwar-cmd).

---

**Study Smarter — plan with purpose, study consistently, and improve every day.**
