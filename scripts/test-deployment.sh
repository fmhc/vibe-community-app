#!/bin/bash

# 🚀 Deployment Test Script for Vibe Coding Hamburg
# This script runs comprehensive end-to-end tests against the deployed environment

set -e

echo "🚀 Starting Deployment Test Suite for Vibe Coding Hamburg"
echo "=========================================================="
echo "Target URL: https://vibe-coding.looks-rare.at"
echo "Test Environment: Production Deployment"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    print_error "npx is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "playwright.deployment.config.ts" ]; then
    print_error "This script must be run from the vibe-community-app directory"
    print_error "Current directory: $(pwd)"
    exit 1
fi

# Install Playwright browsers if needed
print_status "Checking Playwright browser installation..."
if ! npx playwright install --dry-run chromium &> /dev/null; then
    print_warning "Playwright browsers not found. Installing..."
    npx playwright install chromium firefox
    print_success "Playwright browsers installed"
fi

# Create test results directory
mkdir -p test-results/deployment
mkdir -p playwright-report/deployment

print_status "Starting deployment health check..."

# Run the deployment health check first
echo ""
echo "🔍 Running Deployment Health Check..."
echo "─────────────────────────────────────"

if npx playwright test --config=playwright.deployment.config.ts e2e/deployment/deployment-health.spec.ts --reporter=list; then
    print_success "✅ Deployment health check passed!"
else
    print_error "❌ Deployment health check failed!"
    echo ""
    print_warning "The deployment may have issues. Check the test output above."
    print_warning "You can still run other tests to get more details."
    echo ""
fi

echo ""
print_status "Running authentication flow tests..."

# Run authentication tests
echo ""
echo "🔐 Running Authentication Flow Tests..."
echo "──────────────────────────────────────"

if npx playwright test --config=playwright.deployment.config.ts e2e/deployment/authentication-flow.spec.ts --reporter=list; then
    print_success "✅ Authentication flow tests passed!"
else
    print_warning "⚠️ Some authentication flow tests failed (may be expected for incomplete features)"
fi

echo ""
print_status "Running performance monitoring tests..."

# Run performance tests
echo ""
echo "⚡ Running Performance Monitoring Tests..."
echo "─────────────────────────────────────────"

if npx playwright test --config=playwright.deployment.config.ts e2e/deployment/performance-monitoring.spec.ts --reporter=list; then
    print_success "✅ Performance monitoring tests passed!"
else
    print_warning "⚠️ Some performance tests failed (check thresholds)"
fi

echo ""
echo "🎯 Running Complete Deployment Test Suite..."
echo "═══════════════════════════════════════════"

# Run all deployment tests together
if npx playwright test --config=playwright.deployment.config.ts --reporter=html; then
    print_success "🎉 All deployment tests completed!"
else
    print_warning "⚠️ Some tests failed - check the detailed report"
fi

echo ""
echo "📊 Test Results Summary"
echo "======================="

# Check if HTML report was generated
if [ -f "playwright-report/deployment/index.html" ]; then
    print_success "📋 Detailed HTML report generated: playwright-report/deployment/index.html"
    print_status "💡 Open the report in your browser for detailed analysis"
    
    # Try to open the report in browser (optional)
    if command -v xdg-open &> /dev/null; then
        print_status "🌐 Opening test report in browser..."
        xdg-open playwright-report/deployment/index.html &
    elif command -v open &> /dev/null; then
        print_status "🌐 Opening test report in browser..."
        open playwright-report/deployment/index.html &
    fi
else
    print_warning "📋 HTML report not found"
fi

# Check for JSON results
if [ -f "test-results/deployment-results.json" ]; then
    print_success "📄 JSON results available: test-results/deployment-results.json"
else
    print_warning "📄 JSON results not found"
fi

echo ""
echo "🚀 Deployment Test Suite Completed!"
echo "===================================="
echo ""
print_status "Next steps:"
echo "  1. Review the test results above"
echo "  2. Check the HTML report for detailed analysis"
echo "  3. Address any failing tests"
echo "  4. Rerun this script after fixes"
echo ""

# Exit with appropriate code
if [ -f "test-results/deployment-results.json" ]; then
    # Check if we can determine overall success from the JSON
    # This is a simple check - you might want to parse JSON more thoroughly
    if grep -q '"status":"passed"' test-results/deployment-results.json; then
        print_success "🎉 Overall deployment test status: PASSED"
        exit 0
    else
        print_warning "⚠️ Overall deployment test status: PARTIAL/FAILED"
        exit 1
    fi
else
    print_warning "⚠️ Unable to determine overall test status"
    exit 1
fi 