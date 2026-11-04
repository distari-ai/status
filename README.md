# Distari status

The source of [status.distari.com](https://status.distari.com), Distari's public status page. It runs on GitHub alone (Actions, Issues and Pages), so it stays up when Distari's own servers, database or cloud project are down.

<!--start: status pages-->
<!--end: status pages-->

## Posting an incident

Incidents are issues with the `status` label. Use the **Incident** template (it adds the label), from the web or the GitHub mobile app:

- **Post:** open an issue from the template within 15 minutes of confirming customer impact.
- **Update:** add a comment at least every 30 minutes while impact continues.
- **Resolve:** close the issue once affected workflows have been stable for 15 minutes.

The checks open an issue on their own when an endpoint fails three times in a row within one run, and close it when it recovers. Add a comment saying what users see.

Everything here is public. Never post customer names or identifiers, research content, credentials, logs or internal host details. The outage runbook is `docs/engineering/outage-communication.md` in the private `distari-ai/project` repo.

Built on [Upptime](https://upptime.js.org) by Anand Chowdhary (MIT, see `LICENSE.upptime`).
