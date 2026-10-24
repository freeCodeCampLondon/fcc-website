# Contributors

- [Nnamdi Michael Okpala](https://www.github.com/okpalan)
- [Alexander Brown](https://github.com/webtechalex)
- [Carlos Ferreira](https://github.com/cajogos)
- [Vu Dao](https://github.com/v24dao)
- [Rob Chu](https://github.com/RobChooses)
- [Dempsey Palacio Tascon](https://github.com/deej-tsn)
- [Benny Yeung](https://github.com/bennyyeung)
- [Helen Sou](https://github.com/HSSH686)
- [Ramiza Rahman](https://github.com/ram-r-123)
- [Anthea Lee](https://github/com/ankt11)
- [Sujan Rai](https://github.com/raeesuzann)
- [Dennis Rumanek](https://github.com/FrontEndHighRoller)
- [Bibek Gautam](https://github.com/BG-bibek)
- [Kachi Kanu](https://github.com/0xKanu)

# How to Contribute

To get started making a change to this project: fork this repo to your own GitHub account; clone the fork; make your changes on your clone; commit and push your changes to your fork.
Once you have your changes on your fork on GitHub, make a pull request to the main branch in the freeCodeCampLondon/fcc-website repo.
You can help maintainers to get your code merged more quickly by filling out the description field in the PR, giving a clear description of changes and their rationale. If you have made any design changes or additions, adding appropriate screenshots may also help get things merged quickly.

# Advice for new developers

When we start learning to code, most often we practise on our own, and we don't use version control. Using version control can be a difficult challenge in the first days of our first job.
We hope that members of the freeCodeCamp London community will benefit from the experience of contributing to this project by becoming familiar with how teams collaborate on software development in a work environment.

### I'm new to all this. How do I get started?

If you are a new developer, and you haven't used version control tools such as Git and GitHub before, the experience can be confusing at first.
A good place to start is to check out [freeCodeCamp&#39;s own article on Git and GitHub](https://www.freecodecamp.org/news/introduction-to-git-and-github/). The article explains key concepts and contains links to other resources so that you can get more information or alternative explanations as needed.
Also feel free to drop into our discord and ask us for advice!

# Writing a blog post

Anyone in the community can write for the blog. Posts are Markdown files, and you submit them as a pull request.

1. Fork this repository and clone your fork.
2. Copy `src/content/blog/_template.md` to `src/content/blog/<slug>.md`. The slug is lowercase words joined by hyphens, for example `my-first-hackathon.md`, and becomes the address: `/blog/my-first-hackathon/`.
3. Fill in the front matter (the fields between the `---` lines). The template explains each one. Keep `draft: true` while you write.
4. Write the post in Markdown. Start sections with `##` (the title is already the main heading). Put images next to the post and give each one alt text.
5. Preview it with `npm install` and then `npm run dev`, and open http://localhost:4321/blog/.
6. Set `draft: false`, run `npm run format:fix`, commit, push to your fork and open a pull request.

Any organiser can review and merge a post. We check that it:

- is on topic for the community and accurate
- is kind and inclusive, in line with the [freeCodeCamp code of conduct](https://www.freecodecamp.org/news/code-of-conduct/)
- contains no personal data or credentials (yours or anyone else's), and people named or pictured have agreed
- uses images you are allowed to share, each with alt text
- has valid front matter (the build checks it)
