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
    context.sha = 'sha';
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
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('sha')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Draft release is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('sha')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('auto tagged with semantic version', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('major')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('sha')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Unsupported tag schema', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('test');

    await run();

    expect(createRelease).not.toHaveBeenCalled();
  });

  test('Release with empty body is created', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('sha')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Outputs are set', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('sha')
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
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('sha')
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
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Auto increment with defaults', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v2',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Auto increment with prerelease version', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0-pre.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('prerelease')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1-pre.1',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Auto increment with prerelease version - semantic', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.0.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('prerelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.1-beta.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Auto increment with premajor version - semantic', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.0.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('premajor')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v2.0.0-beta.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Invalid last tag', async () => {
    jest.resetModules();
    mockValues([{ ref: '$@#' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('xyz')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false');

    await run();

    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'Failed to parse tag: $@#');
  });

  test('Unsupported auto increment type', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
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
