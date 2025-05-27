import { useState } from 'react';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

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

export default function CommunitySignupForm() {
  const { t } = useTranslation();
  
  const projectOptions = [
    { value: 'web', label: t('form.project.options.web'), icon: '🌐' },
    { value: 'ai', label: t('form.project.options.ai'), icon: '🤖' },
    { value: 'mobile', label: t('form.project.options.mobile'), icon: '📱' },
    { value: 'other', label: t('form.project.options.other'), icon: '💡' },
  ];

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
    if (value <= 20) return t('form.experience.levels.beginner');
    if (value <= 40) return t('form.experience.levels.learning');
    if (value <= 60) return t('form.experience.levels.building');
    if (value <= 80) return t('form.experience.levels.comfortable');
    return t('form.experience.levels.experienced');
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

  // Simplified validation - only email is required
  const canProceedFromStep1 = isValidEmail(formData.email);
  const canProceedFromStep2 = true; // No required fields in step 2

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold glow-text mb-4">
            {t('form.title')}
          </h2>
          <p className="text-gray-300">
            {t('form.subtitle')}
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
          {/* Hidden inputs to ensure all form data is submitted regardless of current step */}
          <input type="hidden" name="email" value={formData.email} />
          <input type="hidden" name="name" value={formData.name} />
          <input type="hidden" name="experienceLevel" value={formData.experienceLevel} />
          <input type="hidden" name="projectInterest" value={formData.projectInterest} />
          <input type="hidden" name="projectDetails" value={formData.projectDetails} />
          <input type="hidden" name="githubUsername" value={formData.githubUsername} />
          <input type="hidden" name="linkedinUrl" value={formData.linkedinUrl} />
          <input type="hidden" name="discordUsername" value={formData.discordUsername} />

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-float">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.email.label')} *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="input-field w-full"
                  placeholder={t('form.email.placeholder')}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('form.email.help')}
                </p>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.name.label')}
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="input-field w-full"
                  placeholder={t('form.name.placeholder')}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('form.name.help')}
                </p>
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
                {t('form.buttons.continue')}
              </button>
              
              <div className="text-center">
                <button
                  type="submit"
                  disabled={!canProceedFromStep1 || isSubmitting}
                  className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors duration-300 text-sm underline"
                >
                  {isSubmitting ? t('form.buttons.joining') : t('form.buttons.skipEmail')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Experience & Interests */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-float">
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.experience.label')}
                </label>
                <div className="space-y-4">
                  <input
                    type="range"
                    id="experienceLevel"
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  {t('form.project.label')}
                </label>
                <div className="grid grid-cols-2 gap-4">
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
                  {t('form.projectDetails.label')}
                </label>
                <textarea
                  id="projectDetails"
                  value={formData.projectDetails}
                  onChange={(e) => updateFormData('projectDetails', e.target.value)}
                  className="input-field w-full h-24 resize-none"
                  placeholder={t('form.projectDetails.placeholder')}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary flex-1"
                >
                  {t('form.buttons.back')}
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary flex-1"
                >
                  {t('form.buttons.continue')}
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-vaporwave-cyan hover:text-vaporwave-pink transition-colors duration-300 text-sm underline"
                >
                  {isSubmitting ? t('form.buttons.joining') : t('form.buttons.skipNow')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Social Links */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-float">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-vaporwave-cyan mb-2">
                  {t('form.social.title')}
                </h3>
                <p className="text-gray-400 text-sm">
                  {t('form.social.subtitle')}
                </p>
              </div>

              <div>
                <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.social.github.label')}
                </label>
                <input
                  type="text"
                  id="githubUsername"
                  value={formData.githubUsername}
                  onChange={(e) => updateFormData('githubUsername', e.target.value)}
                  className="input-field w-full"
                  placeholder={t('form.social.github.placeholder')}
                />
              </div>

              <div>
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.social.linkedin.label')}
                </label>
                <input
                  type="url"
                  id="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateFormData('linkedinUrl', e.target.value)}
                  className="input-field w-full"
                  placeholder={t('form.social.linkedin.placeholder')}
                />
              </div>

              <div>
                <label htmlFor="discordUsername" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('form.social.discord.label')}
                </label>
                <input
                  type="text"
                  id="discordUsername"
                  value={formData.discordUsername}
                  onChange={(e) => updateFormData('discordUsername', e.target.value)}
                  className="input-field w-full"
                  placeholder={t('form.social.discord.placeholder')}
                />
              </div>

              {actionData?.error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                  {actionData.error}
                </div>
              )}

              {actionData?.success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200">
                  {actionData.message || t('form.messages.success')}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary flex-1"
                >
                  {t('form.buttons.back')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('form.buttons.joining') : t('form.buttons.join')}
                </button>
              </div>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
} 