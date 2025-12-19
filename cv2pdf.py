#!/usr/bin/env python3

import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
	import json5
except ImportError:
	print('Error: json5 library required. Install with: pip install json5')
	sys.exit(1)

try:
	from playwright.sync_api import sync_playwright
except ImportError:
	print('Error: Playwright required. Install with: pip install playwright')
	print('Then run: playwright install')
	sys.exit(1)


SCRIPT_DIR = Path(__file__).parent
CSS_FILE = SCRIPT_DIR / 'styles' / 'cv.css'
DEFAULTS_FILE = SCRIPT_DIR / 'defaults.json5'

quiet = False


def log(*args):
	if not quiet:
		print(*args)


def logErr(*args):
	print(*args, file=sys.stderr)


def load_defaults() -> Dict[str, Any]:
	if not DEFAULTS_FILE.exists():
		return {
			'name': 'Your Name',
			'email': 'email@example.com',
			'github': 'https://github.com',
			'linkedin': 'https://linkedin.com',
			'education': [],
			'projects': [],
			'lang': 'en',
		}

	content = DEFAULTS_FILE.read_text(encoding='utf-8')
	try:
		parsed = json5.loads(content)
		return {
			'name': parsed.get('name', 'Your Name'),
			'email': parsed.get('email', 'email@example.com'),
			'github': parsed.get('github', 'https://github.com'),
			'linkedin': parsed.get('linkedin', 'https://linkedin.com'),
			'education': parsed.get('education', []),
			'projects': parsed.get('projects', []),
			'lang': parsed.get('lang', 'en'),
		}
	except Exception as err:
		logErr(f'Warning: Failed to parse defaults.json5: {err}')
		return {
			'name': 'Your Name',
			'email': 'email@example.com',
			'github': 'https://github.com',
			'linkedin': 'https://linkedin.com',
			'education': [],
			'projects': [],
			'lang': 'en',
		}


def load_resume(file_path: str) -> Dict[str, Any]:
	path_obj = Path(file_path)
	if not path_obj.exists():
		raise FileNotFoundError(f'File not found: {file_path}')

	content = path_obj.read_text(encoding='utf-8')
	try:
		return json5.loads(content)
	except Exception as err:
		raise ValueError(f'Failed to parse {file_path}: {err}')


def merge_with_defaults(resume: Dict[str, Any], defaults: Dict[str, Any]) -> Dict[str, Any]:
	return {
		'name': resume.get('name', defaults['name']),
		'email': resume.get('email', defaults['email']),
		'github': resume.get('github', defaults['github']),
		'linkedin': resume.get('linkedin', defaults['linkedin']),
		'education': resume.get('education') if 'education' in resume else defaults['education'],
		'projects': resume.get('projects') if 'projects' in resume else defaults['projects'],
		'summary': resume.get('summary', ''),
		'skills': resume.get('skills', []),
		'experience': resume.get('experience', []),
		'lang': resume.get('lang', 'en'),
	}


def expand_files(pattern: str) -> List[str]:
	if '*' in pattern:
		parent = Path(pattern).parent
		if not parent.exists():
			return []

		glob_pattern = Path(pattern).name
		return sorted([str(f) for f in parent.glob(glob_pattern)])

	return [pattern]


def format_date(date_str: Optional[str]) -> str:
	if not date_str:
		return ''
	try:
		if isinstance(date_str, str):
			if date_str.endswith('Z'):
				date_str = date_str[:-1] + '+00:00'
			date_obj = datetime.fromisoformat(date_str)
			return date_obj.strftime('%b %Y')
	except (ValueError, AttributeError):
		pass
	return ''


def format_url(url: str) -> str:
	try:
		return url.replace('https://', '').replace('http://', '').replace('www.', '')
	except Exception:
		return url


def load_css() -> str:
	if not CSS_FILE.exists():
		logErr(f'Warning: CSS file not found at {CSS_FILE}')
		return ''

	return CSS_FILE.read_text(encoding='utf-8')


def generate_html(raw_resume: Dict[str, Any]) -> str:
	defaults = load_defaults()
	resume = merge_with_defaults(raw_resume, defaults)

	name = resume['name']
	email = resume['email']
	github = resume['github']
	linkedin = resume['linkedin']
	summary = resume['summary']
	skills = resume['skills']
	experience = resume['experience']
	projects = resume['projects']
	education = resume['education']
	lang = resume['lang']

	if lang == 'es':
		labels = {
			'skills': 'Habilidades',
			'experience': 'Experiencia',
			'projects': 'Proyectos',
			'education': 'Educación',
			'present': 'Presente',
		}
	else:
		labels = {
			'skills': 'Skills',
			'experience': 'Experience',
			'projects': 'Projects',
			'education': 'Education',
			'present': 'Present',
		}

	optimized_experience = [
		{**exp, 'achievements': exp.get('achievements', [])}
		for exp in (experience if isinstance(experience, list) else [])
		if exp is not None
	]

	skills_html = ''
	if skills:
		skills_secondary = ''
		if len(skills) > 2:
			skills_secondary = f'<div class="skills-secondary">{", ".join(skills[2:])}</div>'

		skills_html = f"""
    <section class="skills-section">
      <h2 class="section-header">{labels['skills']}</h2>
      <div class="skills-list">
        <div class="skills-primary">
          {', '.join(skills[:2])}
        </div>
        {skills_secondary}
      </div>
    </section>
  """

	experience_html = ''
	if optimized_experience:
		experience_items = []
		for job in optimized_experience:
			title = job.get('title', '')
			company = job.get('company', '')
			start = job.get('start', '')
			end = job.get('end', '')
			timeframe = job.get('timeframe', '')
			achievements = job.get('achievements', [])

			if start:
				date_str = format_date(start)
				if end:
					date_str += f' - {format_date(end)}'
				else:
					date_str += f' - {labels["present"]}'
			else:
				date_str = timeframe

			achievements_html = '\n            '.join(f'<li>{bullet}</li>' for bullet in achievements)

			experience_items.append(f"""
        <div class="job-item">
          <div class="job-header">
            <div>
              <span class="job-title">{title}</span>
              <span>at {company}</span>
            </div>
            <span class="job-dates">{date_str}</span>
          </div>
          <ul class="achievements-list">
            {achievements_html}
          </ul>
        </div>
      """)

		experience_html = f"""
    <section class="experience-section">
      <h2 class="section-header">{labels['experience']}</h2>
      {''.join(experience_items)}
    </section>
  """

	valid_projects = []
	for p in projects:
		if p is None:
			continue
		if isinstance(p, str):
			continue
		if not (p.get('name') or p.get('url') or p.get('description')):
			continue
		valid_projects.append(p)

	projects_html = ''
	if valid_projects:
		project_items = []
		for project in valid_projects:
			name_p = project.get('name', 'Untitled')
			url_p = project.get('url', '#')
			description = project.get('description', '')

			url_link = ''
			if url_p != '#':
				url_link = f'<a href="{url_p}" target="_blank" rel="noopener noreferrer" class="project-url">{format_url(url_p)}</a>'

			description_html = ''
			if description:
				description_html = f'<p class="project-description">{description}</p>'

			project_items.append(f'''
        <div class="project-item">
          <div class="project-header">
            <a href="{url_p}" target="_blank" rel="noopener noreferrer" class="project-name">
              {name_p}
            </a>
            {url_link}
          </div>
          {description_html}
        </div>
      ''')

		projects_html = f"""
    <section class="projects-section">
      <h2 class="section-header">{labels['projects']}</h2>
      {''.join(project_items)}
    </section>
  """

	education_html = ''
	if education:
		education_items = []
		for edu in education:
			degree = edu.get('degree', 'Degree')
			school = edu.get('school', 'School')
			year = edu.get('year', '')

			education_items.append(f"""
        <div class="education-item">
          <div>
            <span class="degree">{degree}</span>
            <span>from {school}</span>
          </div>
          <span class="year">{year}</span>
        </div>
      """)

		education_html = f"""
    <section class="education-section">
      <h2 class="section-header">{labels['education']}</h2>
      {''.join(education_items)}
    </section>
  """

	css = load_css()

	summary_html = ''
	if summary:
		summary_html = f"""
      <section class="summary-section">
        <p>{summary}</p>
      </section>
    """

	return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name} - CV</title>
  <style>
{css}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>{name}</h1>
      <div class="contact-info">
        <a href="mailto:{email}">{email}</a>
        <span>|</span>
        <a href="{github}">github.com/mrgnw</a>
        <span>|</span>
        <a href="{linkedin}">linkedin.com/in/mrgnw</a>
      </div>
    </header>

    {summary_html}
    {skills_html}
    {experience_html}
    {projects_html}
    {education_html}
  </div>
</body>
</html>'''.strip()


def generate_pdf(browser, resume_path: str, output_path: str) -> Dict[str, Any]:
	resume = load_resume(resume_path)

	try:
		html = generate_html(resume)
		page = browser.new_page()

		page.set_content(html, wait_until='networkidle')

		output = Path(output_path)
		output.parent.mkdir(parents=True, exist_ok=True)

		page.pdf(
			path=output_path,
			format='A4',
			print_background=True,
			margin={
				'top': '6mm',
				'bottom': '6mm',
				'left': '8mm',
				'right': '8mm',
			},
			prefer_css_page_size=False,
		)

		page.close()

		log(f'✅ {Path(resume_path).name} → {output_path}')
		return {'success': True, 'file': resume_path}
	except Exception as error:
		logErr(f'✗ {Path(resume_path).name}: {error}')
		return {'success': False, 'file': resume_path, 'error': str(error)}


def main():
	global quiet

	parser = argparse.ArgumentParser(
		description='Generate PDFs from JSON/JSON5 resume files',
		formatter_class=argparse.RawDescriptionHelpFormatter,
		epilog="""
Examples:
  python cv2pdf.py resume.json5 output.pdf
  python cv2pdf.py cvs/*.json5 output/
  python cv2pdf.py cvs/*.json5 output/ --parallel 3 --quiet
		""",
	)

	parser.add_argument('input', help='Input resume file or glob pattern')
	parser.add_argument('output', help='Output PDF file or directory')
	parser.add_argument(
		'--parallel',
		type=int,
		default=2,
		help='Number of PDFs to generate in parallel (default: 2)',
	)
	parser.add_argument('--quiet', action='store_true', help='Suppress logging output')

	args = parser.parse_args()

	quiet = args.quiet

	input_files = expand_files(args.input)

	if not input_files:
		logErr(f'✗ No files found matching: {args.input}')
		sys.exit(1)

	log('🌐 Initializing browser...')

	with sync_playwright() as p:
		browser = p.chromium.launch(headless=True)

		is_directory = args.output.endswith('/') or len(input_files) > 1
		output_dir = args.output if is_directory else str(Path(args.output).parent)
		single_output_name = None if is_directory else Path(args.output).name

		log(f'📄 Generating {len(input_files)} PDF(s)...\n')

		results = []

		for i in range(0, len(input_files), args.parallel):
			batch = input_files[i : i + args.parallel]

			for input_file in batch:
				if single_output_name and len(input_files) == 1:
					out_path = args.output
				else:
					base_name = Path(input_file).stem
					out_path = str(Path(output_dir) / f'{base_name}.pdf')

				result = generate_pdf(browser, input_file, out_path)
				results.append(result)

		succeeded = sum(1 for r in results if r['success'])
		failed = sum(1 for r in results if not r['success'])

		message = f'\n✅ Complete: {succeeded} succeeded'
		if failed > 0:
			message += f', {failed} failed'

		log(message)

		browser.close()

		sys.exit(1 if failed > 0 else 0)


if __name__ == '__main__':
	try:
		main()
	except Exception as err:
		logErr(f'❌ Error: {err}')
		sys.exit(1)
