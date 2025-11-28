# Contributing Guide

Thank you for your interest in contributing to the IoT Web3 Water Quality Monitoring System!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/IOT_Web3.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit: `git commit -m "Add feature: description"`
7. Push: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Workflow

### Code Style

- Use ESLint and Prettier (if configured)
- Follow existing code patterns
- Write clear, descriptive variable and function names
- Add comments for complex logic

### Testing

- Test all new features locally
- Verify database migrations work correctly
- Test MQTT message flow
- Verify blockchain transactions (use testnet)
- Test frontend components in different browsers

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new sensor type support`
- `fix: Resolve MQTT connection timeout`
- `docs: Update API documentation`
- `refactor: Improve database query performance`

## Project Structure

- `contracts/` - Solidity smart contracts
- `backend/` - Node.js API server
- `frontend/` - React frontend application
- `mqtt-simulator/` - MQTT test data generator

## Areas for Contribution

### Features
- Additional sensor types
- Advanced analytics
- Alert/notification system
- Mobile app
- Multi-chain support
- IPFS integration

### Improvements
- Performance optimization
- Security enhancements
- Better error handling
- UI/UX improvements
- Documentation
- Test coverage

### Bug Fixes
- Check existing issues
- Reproduce the bug
- Fix and test
- Submit PR with description

## Pull Request Process

1. Update README.md if needed
2. Update documentation for new features
3. Ensure all tests pass
4. Request review from maintainers
5. Address review feedback

## Questions?

Open an issue for questions or discussions about features.

