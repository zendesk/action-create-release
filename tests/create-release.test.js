jest.mock('@actions/core');
jest.mock('@actions/github');

/* eslint-disable no-undef */
describe('Create Release', () => {
  let context;
  let core;
  let createRelease;
  let GitHub;
  let listMatchingRefs;
  let run;

  function mockValues(previousTags = []) {
    core = require('@actions/core');
    const gitHub = require('@actions/github');
    [GitHub, context] = [gitHub.GitHub, gitHub.context];
    createRelease = jest.fn().mockReturnValueOnce({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl'
      }
    });

    listMatchingRefs = jest.fn().mockReturnValueOnce({
      data: previousTags
    });

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const octokit = {
      repos: {
        createRelease
      },
      git: {
        listMatchingRefs
      }
    };

    GitHub.mockImplementation(() => octokit);
    run = require('../src/create-release.js');
  }

  beforeEach(() => {
    jest.resetModules();
    mockValues();
  });

  test('Create release endpoint is called', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false
    });
  });

  test('Draft release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false
    });
  });

  test('Release with empty body is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false
    });
  });

  test('Outputs are set', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    core.setOutput = jest.fn();

    await run();

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'current_tag', 'v1.0.0');
    expect(core.setOutput).toHaveBeenNthCalledWith(2, 'id', 'releaseId');
    expect(core.setOutput).toHaveBeenNthCalledWith(3, 'html_url', 'htmlUrl');
    expect(core.setOutput).toHaveBeenNthCalledWith(4, 'upload_url', 'uploadUrl');
  });

  test('Action fails elegantly', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease.mockRestore();
    createRelease.mockImplementation(() => {
      throw new Error('Error creating release');
    });

    core.setOutput = jest.fn();

    core.setFailed = jest.fn();

    await run();

    expect(createRelease).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith('Error creating release');
    expect(core.setOutput).toHaveBeenCalledTimes(0);
  });

  test('Auto increment set initial tag', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false
    });
  });

  test('Auto increment with defaults', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.1.1',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false
    });
  });

  test('Auto increment with prerelease version', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0-pre.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('prerelease')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.1.0-pre.1',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false
    });
  });

  test('Unsupported auto increment type', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('xyz')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'Unsupported semantic version type xyz. Must be one of (major, minor, patch, premajor, prerelease)'
    );
  });
});
