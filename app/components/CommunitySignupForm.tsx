import { useState } from 'react';
import { Form, useActionData, useNavigation } from '@remix-run/react';

interface FormData {
  email: string;
  name: string;
  experienceLevel: number;
  projectInterest: string;
  projectDetails: string;
  githubUsername: string;
  linkedinUrl: string;
  discordUsername: string;
}

const projectOptions = [
  { value: 'web', label: 'Web App', icon: '🌐' },
  { value: 'ai', label: 'AI Tool', icon: '🤖' },
  { value: 'mobile', label: 'Mobile App', icon: '📱' },
];

export default function CommunitySignupForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    experienceLevel: 50,
    projectInterest: '',
    projectDetails: '',
    githubUsername: '',
    linkedinUrl: '',
    discordUsername: '',
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const actionData = useActionData<any>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getExperienceLabel = (value: number) => {
    if (value <= 20) return 'Just getting started 🌱';
    if (value <= 40) return 'Learning the basics 📚';
    if (value <= 60) return 'Building confidence 💪';
    if (value <= 80) return 'Pretty comfortable 🚀';
    return 'Quite experienced 🎯';
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canProceedFromStep1 = isValidEmail(formData.email) && formData.name.trim().length > 0;
  const canProceedFromStep2 = formData.projectInterest !== '';

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold glow-text mb-4">
            Join Vibe Coding Hamburg
          </h2>
          <p className="text-gray-300">
            Be part of Hamburg's most vibrant AI-powered coding community
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-vaporwave-pink to-vaporwave-purple text-white'
                    : 'bg-vaporwave-card border border-vaporwave-cyan/30 text-gray-400'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="w-full bg-vaporwave-card rounded-full h-2">
            <div
              className="bg-gradient-to-r from-vaporwave-pink to-vaporwave-purple h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <Form method="post" className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-float">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="input-field w-full"
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="input-field w-full"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-300 mb-2">
                  How comfortable are you with coding?
                </label>
                <div className="space-y-4">
                  <input
                    type="range"
                    id="experienceLevel"
                    name="experienceLevel"
                    min="0"
                    max="100"
                    value={formData.experienceLevel}
                    onChange={(e) => updateFormData('experienceLevel', parseInt(e.target.value))}
                    className="w-full h-2 bg-vaporwave-card rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-center">
                    <span className="text-vaporwave-cyan font-medium">
                      {getExperienceLabel(formData.experienceLevel)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedFromStep1}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  canProceedFromStep1
                    ? 'btn-primary'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Project Interest */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-float">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  What type of project interests you most? *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {projectOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer transition-all duration-300 ${
                        formData.projectInterest === option.value
                          ? 'ring-2 ring-vaporwave-cyan'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="projectInterest"
                        value={option.value}
                        checked={formData.projectInterest === option.value}
                        onChange={(e) => updateFormData('projectInterest', e.target.value)}
                        className="sr-only"
                      />
                      <div className="card text-center p-4 hover:border-vaporwave-cyan/60">
                        <div className="text-2xl mb-2">{option.icon}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-300 mb-2">
                  Tell us about your project idea (optional)
                </label>
                <textarea
                  id="projectDetails"
                  name="projectDetails"
                  value={formData.projectDetails}
                  onChange={(e) => updateFormData('projectDetails', e.target.value)}
                  className="input-field w-full h-24 resize-none"
                  placeholder="What are you working on or want to build?"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedFromStep2}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                    canProceedFromStep2
                      ? 'btn-primary'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Social Links */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-float">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-vaporwave-cyan mb-2">
                  Connect with the community
                </h3>
                <p className="text-gray-400 text-sm">
                  Help us connect you with fellow developers (all optional)
                </p>
              </div>

              <div>
                <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-300 mb-2">
                  GitHub Username
                </label>
                <input
                  type="text"
                  id="githubUsername"
                  name="githubUsername"
                  value={formData.githubUsername}
                  onChange={(e) => updateFormData('githubUsername', e.target.value)}
                  className="input-field w-full"
                  placeholder="your-github-username"
                />
              </div>

              <div>
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-300 mb-2">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  id="linkedinUrl"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateFormData('linkedinUrl', e.target.value)}
                  className="input-field w-full"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label htmlFor="discordUsername" className="block text-sm font-medium text-gray-300 mb-2">
                  Discord Username
                </label>
                <input
                  type="text"
                  id="discordUsername"
                  name="discordUsername"
                  value={formData.discordUsername}
                  onChange={(e) => updateFormData('discordUsername', e.target.value)}
                  className="input-field w-full"
                  placeholder="username#1234"
                />
              </div>

              {actionData?.error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                  {actionData.error}
                </div>
              )}

              {actionData?.success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200">
                  Welcome to the community! We'll be in touch soon.
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Joining...' : 'Join Community'}
                </button>
              </div>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
} 