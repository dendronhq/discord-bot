import { Octokit } from '@octokit/rest';
// import crypto from 'crypto';
import yaml from 'js-yaml';
import matter from 'gray-matter';
// import _ from 'lodash';
import { IntermediateDendronConfig } from '@dendronhq/common-all';
// import { Inbox } from '../components';
import config from '../config';

export type GithubServiceOpts = {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
};

let _singleton: GithubService | undefined;

export class GithubService {
  private octokit: Octokit;

  private owner: string;

  private repo: string;

  private branch: string;

  public dendronConfig: IntermediateDendronConfig | undefined;

  static instance() {
    if (!_singleton) {
      _singleton = new GithubService();
    }
    return _singleton;
  }

  constructor() {
    this.octokit = new Octokit({ auth: config.GITHUB_PAT });
    this.owner = config.OWNER;
    this.repo = config.REPO;
    this.branch = config.BRANCH;
  }

  private getServiceProps() {
    return {
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
    };
  }

  private async getCurrentCommit() {
    const { data: refData } = await this.octokit.git.getRef({
      ...this.getServiceProps(),
      ref: `heads/${this.branch}`,
    });

    const refCommitSHA = refData.object.sha;
    const { data: commitData } = await this.octokit.git.getCommit({
      ...this.getServiceProps(),
      commit_sha: refCommitSHA,
    });
    return {
      commitSHA: refCommitSHA,
      treeSHA: commitData.tree.sha,
    };
  }

  // not used at the moment. also may need some changes before we start using it.
  // public async pushToDendron(opts: { destination: string; payload: string }) {
  //   const { destination, payload } = opts;

  //   const { commitSHA, treeSHA, content: currentContent } = await this.fetchNote({
  //     name: destination,
  //   });

  //   const inboxItem = new Inbox({ payload });
  //   const newContent = currentContent.concat(inboxItem.toString());

  //   // create a new blob with new content
  //   const newBlob = await this.octokit.rest.git.createBlob({
  //     ...this.getServiceProps(),
  //     content: newContent,
  //     encoding: 'utf-8',
  //   });

  //   // create a new tree containing the new blob
  //   const { data: createTreeData } = await this.octokit.git.createTree({
  //     ...this.getServiceProps(),
  //     tree: [
  //       {
  //         path: `notes/${destination}.md`,
  //         mode: '100644',
  //         type: 'blob',
  //         sha: newBlob.data.sha,
  //       },
  //     ],
  //     base_tree: treeSHA,
  //   });

  //   const { data: createCommitData } = await this.octokit.git.createCommit({
  //     ...this.getServiceProps(),
  //     // commit message is a random hex string
  //     message: crypto.randomBytes(4).toString('hex'),
  //     tree: createTreeData.sha,
  //     parents: [commitSHA],
  //   });

  //   // push
  //   await this.octokit.git.updateRef({
  //     ...this.getServiceProps(),
  //     ref: `heads/${this.branch}`,
  //     sha: createCommitData.sha,
  //     force: true,
  //   });
  // }

  public async fetchNote(opts: {
    name: string;
  }) {
    const { name } = opts;
    if (this.dendronConfig === undefined) {
      const { dendronConfig } = await this.fetchConfig();
      this.dendronConfig = dendronConfig;
    }

    let prefix = 'notes';
    const isSelfContained = this.dendronConfig.dev?.enableSelfContainedVaults;

    if (!isSelfContained) {
      // TODO: this needs to change once we decide to support multivault
      const vault = this.dendronConfig.workspace.vaults[0];
      prefix = vault.fsPath;
    }

    const {
      commitSHA, treeSHA, content,
    } = await this.fetchObject({
      query: `${prefix}/${name}.md`,
    });

    // url grabbed from the octokit api is not human readable.
    // create a humand readable url
    // TODO: we should probably add common-all / common-server in the future
    // and reuse the logic we already have instead of rolling up
    // custom logic separately here
    // this probably also doesn't belong in GithubService
    const url = `https://github.com/${config.OWNER}/${config.REPO}/blob/${config.BRANCH}/${prefix}/${name}.md`;

    const { data: frontmatter, content: body } = matter(content, {
      engines: {
        yaml: {
          parse: (s: string) => yaml.load(s) as object,
          stringify: (data: object) => yaml.dump(data),
        },
      },
    });

    return {
      commitSHA,
      treeSHA,
      content,
      url,
      frontmatter,
      body,
    };
  }

  public async fetchConfig() {
    const { commitSHA, treeSHA, content } = await this.fetchObject({
      query: 'dendron.yml',
    });
    const dendronConfig = yaml.load(content) as IntermediateDendronConfig;
    return {
      commitSHA,
      treeSHA,
      dendronConfig,
    };
  }

  public async fetchObject(opts: {
    query: string;
  }) {
    const { query } = opts;
    // get the current commit's SHA and the tree's SHA
    const { commitSHA, treeSHA } = await this.getCurrentCommit();

    // get the tree recursively using the sha
    const { data: treeData } = await this.octokit.rest.git.getTree({
      ...this.getServiceProps(),
      tree_sha: treeSHA,
      recursive: 'true',
    });

    // find the destination in the tree
    const maybeDest = treeData.tree.find((item) => item.path === query);

    if (maybeDest === undefined) {
    // couldn't find destination. throw.
      throw Error('Cannot find destination');
    }

    if (maybeDest.sha === undefined) {
    // can a git object not have a sha?
      throw Error('Found destination doesn\'t have a SHA-1 hash');
    }

    const destSHA = maybeDest.sha;

    // get the destination's blob
    const { data: destBlobData } = await this.octokit.rest.git.getBlob({
      ...this.getServiceProps(),
      file_sha: destSHA,
    });

    // get the content of the destination's blob
    const content = Buffer.from(destBlobData.content, 'base64').toString(
      'utf-8',
    );

    return {
      commitSHA,
      treeSHA,
      content,
    };
  }
}
