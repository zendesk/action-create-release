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
      .mockReturnValueOnce('continuous')
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
      .mockReturnValueOnce('continuous')
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

  test('auto tagged with semantic version', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('major')
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
      .mockReturnValueOnce('continuous')
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
      .mockReturnValueOnce('continuous')
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
      prerelease: false
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
      prerelease: false
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
      prerelease: false
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
      prerelease: false
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
      prerelease: false
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

  test('Tags are sorted correctly by semantic version', async () => {
    jest.resetModules();
    // Mock unsorted tags with semantic versions mixed up
    const unsortedTags = [
      { ref: 'v1.2.0' },
      { ref: 'v1.275.0' }, // This should be first after sorting
      { ref: 'v1.99.0' },
      { ref: 'v1.1.0' }
    ];

    mockValues(unsortedTags);

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('minor')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    // The highest version (v1.275.0) should be used as the base for incrementing
    // In continuous mode, it should increment the minor version: v1.275.0 -> v1.276.0
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.276.0',
      name: 'v1.276.0',
      body: 'false',
      draft: false,
      prerelease: false
    });
  });

  test('Auto increment with premajor type in continuous mode', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.1.0-beta.0' }]);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('continuous')
      .mockReturnValueOnce('premajor')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v2-beta.0',
      name: 'v2-beta.0',
      body: 'myRelease',
      draft: false,
      prerelease: false
    });
  });

  test('Error in computeNextSemantic function', async () => {
    jest.resetModules();
    mockValues([{ ref: 'v1.0.0' }]);

    // Mock semver.inc to throw an error
    const semver = require('semver');
    jest.spyOn(semver, 'inc').mockImplementation(() => {
      throw new Error('Invalid version');
    });

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('patch')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false');

    core.setFailed = jest.fn();

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('Failed to compute next semantic tag: Error: Invalid version');
  });

  test('Tags with identical semantic versions fall back to string comparison', async () => {
    jest.resetModules();
    // Mock tags that have the same semantic version after coercion
    const identicalTags = [{ ref: 'v1.0.0-alpha' }, { ref: 'v1.0.0-beta' }];

    mockValues(identicalTags);

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('patch')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    // Should use the first tag after sorting (v1.0.0-beta comes first lexicographically when reversed)
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

  test('Tags with non-semantic versions fall back to string comparison', async () => {
    jest.resetModules();
    // Mock non-semantic tags
    const nonSemanticTags = [{ ref: 'build-123' }, { ref: 'build-456' }];

    mockValues(nonSemanticTags);

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('patch')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    core.setFailed = jest.fn();

    await run();

    // Should fail to parse the non-semantic tag
    expect(core.setFailed).toHaveBeenCalledWith('Failed to parse tag: build-456');
  });

  test('Non-semantic tags only - string comparison', async () => {
    jest.resetModules();
    // Mock only non-semantic tags to test string comparison fallback
    const nonSemanticOnlyTags = [{ ref: 'aaa' }, { ref: 'zzz' }];

    mockValues(nonSemanticOnlyTags);

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('patch')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    core.setFailed = jest.fn();

    await run();

    // Should fail to parse the first non-semantic tag after string sorting (zzz comes first when reversed)
    expect(core.setFailed).toHaveBeenCalledWith('Failed to parse tag: zzz');
  });

  test('One semantic one non-semantic tag - semantic version prioritized', async () => {
    jest.resetModules();
    // Mock mixed where one can be parsed as semantic and one cannot
    const mixedOrderTags = [
      { ref: 'abc-def' }, // Non-semantic (cannot be coerced)
      { ref: 'v2.0.0' } // Semantic
    ];

    mockValues(mixedOrderTags);

    core.getInput = jest
      .fn()
      .mockReturnValueOnce('')
      .mockReturnValueOnce('semantic')
      .mockReturnValueOnce('minor')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('false');

    await run();

    // Should prioritize the semantic version v2.0.0 and increment it
    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v2.1.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false
    });
  });
});
