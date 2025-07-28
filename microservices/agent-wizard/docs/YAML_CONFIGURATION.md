# YAML Configuration System

The Agent Wizard microservice uses a YAML-based configuration system for managing industry-specific system prompts and metadata.

## Configuration File Structure

```yaml
industries:
  industry_key:
    name: "Display Name"
    icon: "icon-name"
    system_prompt: |
      Multi-line system prompt
      with {business_name} placeholder
```

## Configuration Features

### 1. Industry Metadata
- **Name**: Human-readable industry name
- **Icon**: Icon identifier for UI components
- **System Prompt**: Detailed, industry-specific AI behavior instructions

### 2. Dynamic Prompt Generation
- Prompts support `{business_name}` placeholder substitution
- Comprehensive industry-specific guidance and disclaimers
- Professional communication standards per industry

### 3. Runtime Configuration
- Configuration can be reloaded without service restart
- API endpoints for accessing specific industry configurations
- Validation checks for prompt availability

## API Endpoints

### Configuration Management
- `GET /api/industries` - List all configured industries
- `GET /api/config/industries/{industry_key}` - Get specific industry config
- `GET /api/config/reload` - Reload configuration from YAML file

### Runtime Operations
- `POST /api/agents/{agent_id}/system-prompt` - Generate agent system prompt
- `POST /api/runtime/chat/{agent_id}` - Get runtime prompt for chat interface
- `POST /api/agents/{agent_id}/validate-deployment` - Validate prompt availability

## Industry Prompts

### Healthcare
Comprehensive medical assistant with:
- Patient support and appointment scheduling
- Health information and wellness guidance
- Medical disclaimers and professional referrals
- HIPAA-compliant communication standards

### Retail & E-commerce
Customer service excellence with:
- Product information and recommendations
- Order management and returns processing
- Sales assistance and upselling
- Customer satisfaction focus

### Finance & Banking
Professional financial services with:
- Account management and transactions
- Financial product information
- Regulatory compliance and security
- Investment disclaimers and referrals

### Technology & Software
Technical support expertise with:
- Product troubleshooting and guidance
- Feature explanations and best practices
- User education and training
- Escalation procedures for complex issues

## Configuration Benefits

### 1. Maintainability
- Centralized prompt management
- Version control for prompt changes
- Easy updates without code deployment
- Clear separation of business logic and configuration

### 2. Customization
- Industry-specific behavior and terminology
- Professional communication standards
- Compliance and regulatory requirements
- Business-specific customizations

### 3. Scalability
- Easy addition of new industries
- Prompt template reusability
- Multi-language support potential
- A/B testing capabilities

## Best Practices

### 1. Prompt Design
- Clear role definition and responsibilities
- Specific communication guidelines
- Appropriate disclaimers and limitations
- Professional tone and language

### 2. Configuration Management
- Regular prompt review and updates
- Version control for configuration files
- Testing prompt changes before deployment
- Documentation of prompt modifications

### 3. Runtime Considerations
- Configuration caching for performance
- Graceful fallback for missing configurations
- Error handling for invalid prompts
- Monitoring prompt usage and effectiveness

## Example Usage

```python
# Load configuration
config = load_industry_prompts()

# Generate system prompt
prompt = generate_system_prompt("healthcare", "MedCare Clinic")

# Get industry metadata
metadata = get_industry_metadata("healthcare")
```

## Configuration Validation

The system validates:
- YAML syntax and structure
- Required fields presence
- Prompt placeholder usage
- Character limits and formatting

## Future Enhancements

1. **Multi-language Support**: Localized prompts for different regions
2. **A/B Testing**: Multiple prompt variants for testing
3. **Analytics Integration**: Prompt performance tracking
4. **Dynamic Updates**: Real-time prompt updates without reload
5. **Template System**: Reusable prompt components and templates