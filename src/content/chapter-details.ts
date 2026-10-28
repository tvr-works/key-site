import { projectUrl, type Chapter } from "./chapters"

interface DetailSection {
  heading: string
  paragraphs: string[]
  code?: string
  label?: string
}

interface ChapterDetail {
  intro: string
  sections: DetailSection[]
  scope?: string
  references: { label: string; href: string }[]
}

// Evidence and release boundaries are recorded in docs/chapter-content.md.
export const chapterDetails: Record<Chapter["id"], ChapterDetail> = {
  use: {
    intro:
      "Send secrets into Key through standard input, and pass stored values to other tools. An unlocked session can serve a sequence of commands without asking you to approve each one.",
    sections: [
      {
        heading: "Save a value without putting it in the command.",
        paragraphs: [
          "Key accepts a hidden prompt or standard input. A generator can pass its output directly into the vault, keeping the secret itself out of command arguments and shell history.",
          "For example, OpenSSL generates a random value and sends it to a named entry:",
        ],
        code: "openssl rand -base64 32 | key add services/api",
      },
      {
        heading: "Keep the value intact through a pipeline.",
        paragraphs: [
          "key get sends the value to standard output. For a pipe or file, it adds no presentation newline; prompts and errors use standard error. Ordinary secret entries preserve their UTF-8 input, including line breaks.",
          "key list returns entry names. With fzf installed, you can select an entry and copy its value in one command:",
        ],
        code: 'key copy "$(key list | fzf)"',
      },
      {
        heading: "Know where plaintext goes.",
        paragraphs: [
          "Once you print, copy, or pass a value to another program, that destination has the plaintext. Running key lock ends the local unlocked session; it does not erase terminal output or clipboard contents.",
        ],
      },
    ],
    references: [
      {
        label: "Command reference",
        href: `${projectUrl}#command-reference`,
      },
      {
        label: "Authentication and sessions",
        href: `${projectUrl}#security-beneath-the-cli`,
      },
    ],
  },
  authenticate: {
    intro:
      "An enrolled Mac is a Mac you have explicitly approved to access the vault. Its private keys are protected by the Secure Enclave, and macOS enforces your approval when those keys are used.",
    sections: [
      {
        heading: "Approve access through macOS.",
        paragraphs: [
          "User presence means macOS asks you to authorize protected key access. It can offer Touch ID while looking for a nearby paired Apple Watch, with your Mac password as a fallback. The available methods depend on your hardware and settings.",
          "Key attaches this requirement to the protected private keys themselves. There is no separate vault password to remember, and your Mac password is not used to derive the vault’s encryption key.",
        ],
      },
      {
        heading: "Two private keys, each bound to this Mac.",
        paragraphs: [
          "Each enrolled Mac creates two Secure Enclave P-256 private keys. A signing key authorizes changes to device access. A separate key-agreement key opens an encrypted copy of the vault key addressed to that Mac, called a wrapper.",
          "These private keys cannot be exported as usable keys for another Mac. Copying the vault folder, or signing into the same cloud account, does not enroll another computer.",
        ],
      },
      {
        heading: "A random vault key, encrypted for each device.",
        paragraphs: [
          "The vault uses a random 256-bit key. CryptoKit’s HPKE, Hybrid Public Key Encryption, wraps it separately for each active Mac using P-256 key agreement, HKDF-SHA256 key derivation, and AES-256-GCM encryption.",
          "Each wrapper is bound to its vault, key, recipient, and the device-access change that created it. Moving it into a different context does not create valid access.",
          "Secret values are sealed with AES-256-GCM. Their vault, entry identity, name, type, and revision are authenticated alongside the ciphertext, tying each value to where it belongs.",
        ],
      },
      {
        heading: "The unlocked session expires after inactivity.",
        paragraphs: [
          "Key Agent, the signed background service, holds the unwrapped vault key in memory during a session. The raw key is not saved in the synced folder or as a reusable Keychain item. The Secure Enclave protects the device private keys; Key Agent performs vault decryption.",
          "The session expires after 15 minutes without vault-key use. Using the key extends that window; key lock or an agent restart ends it. Commands reuse the session, so approval is not requested for every read. Other software able to use the authorized CLI can also use that unlocked access.",
        ],
      },
    ],
    scope:
      "These protections describe device-enrolled vaults. Existing Keychain-backed vaults require an explicit migration.",
    references: [
      {
        label: "Access and migration guidance",
        href: `${projectUrl}#security-beneath-the-cli`,
      },
      {
        label: "Apple’s authentication policy",
        href: "https://developer.apple.com/documentation/LocalAuthentication/LAPolicy/deviceOwnerAuthentication",
      },
    ],
  },
  sync: {
    intro:
      "Suppose your provider delivers a new history record before the encrypted entry it references. Key keeps the last verified state and pauses operations that need the missing file. Arrival order does not decide what the vault trusts.",
    sections: [
      {
        heading: "Every change extends a verified history.",
        paragraphs: [
          "A saved change creates new encrypted objects and a manifest: an authenticated record of the vault’s entries and their history. Existing versions stay immutable. SHA-256 digests identify exact file contents; HMAC-SHA256 authenticates the manifest. Changes to device access also require an active Mac’s digital signature.",
          "Before releasing a value, Key checks that the encrypted entry matches the exact object and revision in its authenticated manifest.",
        ],
      },
      {
        heading: "Each Mac remembers what it has verified.",
        paragraphs: [
          "Each Mac keeps a local checkpoint of its verified history. New history must connect to that checkpoint and pass authentication. A returning Mac follows device-access and key changes in order, verifying each transition before opening its next wrapped key.",
          "A newer timestamp cannot make incomplete data valid, and an older copy cannot silently reset what this Mac trusts. An explicit --allow-stale read can use its last complete verified version. It cannot authorize a write or bypass failed security checks.",
        ],
      },
      {
        heading: "Key detects competing histories.",
        paragraphs: [
          "Two Macs can save changes before receiving each other’s updates. If those changes create competing histories, Key pauses ordinary reads and writes. Immutable files preserve both branches; an explicit stale read can use this Mac’s last complete verified state. The provider’s last-write timestamp does not choose the winning secret.",
          "Competing enrollment, revocation, or key transitions are security conflicts. They are never automatically merged as ordinary content edits.",
        ],
      },
      {
        heading: "A write finishes only after verification.",
        paragraphs: [
          "Key stages encrypted files, publishes entries before their manifest, and verifies the saved objects before advancing its checkpoint. That final update succeeds only if the checkpoint still matches the one the operation started from.",
          "Local recovery records let Key inspect an interrupted write and retain the previous state or finish a verified new one. Missing or contradictory evidence stops the operation; it does not cause an empty replacement vault to be created.",
        ],
      },
      {
        heading: "Verification is independent of the provider.",
        paragraphs: [
          "Encryption, history checks, and device authorization happen in Key. Local APFS and iCloud Drive have been directly qualified; other folder-based providers still need compatible filesystem behavior and testing.",
          "Verification cannot make a provider deliver missing files or replace a backup. Secret values are encrypted; entry names and structural metadata remain visible in storage.",
        ],
      },
    ],
    scope: "These history protections apply to device-enrolled vaults.",
    references: [
      {
        label: "Provider support and conflicts",
        href: `${projectUrl}#provider-setup-and-conflicts`,
      },
    ],
  },
  recover: {
    intro:
      "With a surviving enrolled Mac and usable vault files, you can authorize a replacement. Every active Mac has equal authority; the first computer you enrolled has no special role that must survive.",
    sections: [
      {
        heading: "Keep access on more than one Mac.",
        paragraphs: [
          "An enrolled Mac is one you have approved to open the vault. After authentication and review, any active Mac can approve a replacement or revoke a lost device without exporting its own private keys.",
          "Keep at least two Macs enrolled and back up the vault files. Another enrolled Mac preserves access; a backup preserves the data. Recovery needs both.",
        ],
        code: "key share devices",
      },
      {
        heading: "Changing access changes the encryption.",
        paragraphs: [
          "Adding or removing a Mac creates a new random vault key and re-encrypts the complete current snapshot. Each active Mac receives its own encrypted copy of that key. A newly enrolled Mac receives current data without receiving old encryption keys.",
          "A revoked Mac receives no copy of the new key, preventing it from reading the new snapshot and future changes. Revocation cannot erase old secrets, exports, or history that Mac already had the keys to open.",
        ],
      },
      {
        heading: "Enrollment proves which Mac you are adding.",
        paragraphs: [
          "A new Mac creates its own Secure Enclave identity and answers an invitation that expires after 10 minutes. You compare the displayed device pair and comparison code on both Macs before approving. Approval is bound to that exact exchange.",
          "The approving Mac signs the access change, and the vault key is encrypted for the approved identity. Copying the exchanged messages cannot substitute a different device.",
        ],
      },
      {
        heading: "Physical keys for recovery after every Mac is lost.",
        paragraphs: [
          "Planned PIV hardware recovery would let a registered physical key authorize recovery alongside the encrypted vault files. The proposed design uses independent primary and backup tokens, kept separately; either would hold its own non-exportable recovery key.",
          "Compatible YubiKeys are candidates for this path. Hardware support and PIN and touch behavior still require validation; physical-key recovery is not available in the current release.",
        ],
        label: "Planned",
      },
    ],
    scope:
      "Recovery today requires a surviving enrolled Mac. If every enrolled Mac and its access keys are lost, a vault-folder backup, your Mac password, or your cloud account cannot restore access.",
    references: [
      {
        label: "Enrollment and device continuity",
        href: `${projectUrl}#enrolling-another-mac`,
      },
      {
        label: "Current recovery limits",
        href: `${projectUrl}#install-and-choose-a-release-channel`,
      },
      {
        label: "Hardware recovery design",
        href: `${projectUrl}/blob/main/docs/offline-recovery-models.md`,
      },
    ],
  },
}
